import re
from typing import List, Dict, Any, Optional, Set
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.student import Student
from app.models.alias import StudentRegAlias
from app.models.unrecognized_token import UnrecognizedToken

def normalize_token(token: str) -> str:
    """Normalize token by stripping whitespace, hyphens, slashes, and uppercase."""
    if not token:
        return ""
    # Remove whitespace, hyphens, slashes, underscores
    cleaned = re.sub(r'[\s\-_/\\#.]', '', str(token).strip())
    return cleaned.upper()

def extract_tokens_from_text(raw_text: str) -> List[str]:
    """Extract individual tokens from pasted text (separated by newline, tab, comma, semicolon, space)."""
    if not raw_text:
        return []
    # Split by newline, comma, tab, semicolon
    lines_and_delims = re.split(r'[\n\r,;\t]+', raw_text)
    tokens: List[str] = []
    for chunk in lines_and_delims:
        chunk_str = chunk.strip()
        if chunk_str:
            tokens.append(chunk_str)
    return tokens

class AliasResolverService:
    @staticmethod
    def resolve_tokens(
        db: Session,
        raw_tokens: List[str],
        batch_id: Optional[UUID] = None,
        source_context: Optional[str] = None,
        pr_id: Optional[UUID] = None,
        record_unrecognized: bool = True
    ) -> Dict[str, Any]:
        """
        Resolves a list of raw tokens against student aliases and canonical reg numbers.
        Returns matched students and unrecognized tokens.
        """
        matched_items: List[Dict[str, Any]] = []
        unrecognized_tokens: List[str] = []
        seen_canonical: Set[str] = set()

        for raw_token in raw_tokens:
            if not raw_token or not raw_token.strip():
                continue
            
            raw_str = raw_token.strip()
            normalized = normalize_token(raw_str)
            if not normalized:
                continue

            # 1. Lookup in student_reg_aliases
            alias_query = (
                db.query(StudentRegAlias, Student)
                .join(Student, Student.reg_no == StudentRegAlias.student_reg_no)
                .filter(StudentRegAlias.alias_value == normalized)
            )
            if batch_id:
                alias_query = alias_query.filter(Student.batch_id == batch_id)
            if pr_id:
                alias_query = alias_query.filter(Student.added_by_pr_id == pr_id)

            alias_match = alias_query.first()

            if alias_match:
                alias_record, student = alias_match
                matched_items.append({
                    "raw_token": raw_str,
                    "normalized_token": normalized,
                    "canonical_reg_no": student.reg_no,
                    "student_name": student.name,
                    "format_type": alias_record.format_type.value if hasattr(alias_record.format_type, 'value') else str(alias_record.format_type),
                    "batch_id": student.batch_id,
                    "batch_year": student.batch.year_label if student.batch else None
                })
                seen_canonical.add(student.reg_no)
                continue

            # 2. Lookup directly against students.reg_no
            student_query = db.query(Student).filter(
                func.upper(Student.reg_no) == normalized
            )
            if batch_id:
                student_query = student_query.filter(Student.batch_id == batch_id)
            if pr_id:
                student_query = student_query.filter(Student.added_by_pr_id == pr_id)

            student_match = student_query.first()

            if student_match:
                matched_items.append({
                    "raw_token": raw_str,
                    "normalized_token": normalized,
                    "canonical_reg_no": student_match.reg_no,
                    "student_name": student_match.name,
                    "format_type": "CANONICAL",
                    "batch_id": student_match.batch_id,
                    "batch_year": student_match.batch.year_label if student_match.batch else None
                })
                seen_canonical.add(student_match.reg_no)
                continue

            # 3. Unrecognized Token
            unrecognized_tokens.append(raw_str)
            if record_unrecognized:
                # Check if already logged
                existing = db.query(UnrecognizedToken).filter(
                    UnrecognizedToken.token_value == raw_str,
                    UnrecognizedToken.resolved == False
                ).first()
                if not existing:
                    new_unrec = UnrecognizedToken(
                        token_value=raw_str,
                        source_context=source_context or "Paste Box Resolution",
                        batch_id=batch_id,
                        pr_id=pr_id,
                        resolved=False
                    )
                    db.add(new_unrec)

        if record_unrecognized:
            try:
                db.commit()
            except Exception:
                db.rollback()

        return {
            "total_tokens_found": len(raw_tokens),
            "unique_tokens_count": len(set(raw_tokens)),
            "matched_count": len(matched_items),
            "unrecognized_count": len(unrecognized_tokens),
            "matched": matched_items,
            "unrecognized": list(dict.fromkeys(unrecognized_tokens)) # Deduplicated preserving order
        }
