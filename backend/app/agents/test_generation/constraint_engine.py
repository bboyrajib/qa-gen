import re
import random
import string
from typing import List, Any


def _luhn_check(n: str) -> bool:
    digits = [int(d) for d in n if d.isdigit()]
    for i in range(len(digits) - 2, -1, -2):
        digits[i] *= 2
        if digits[i] > 9:
            digits[i] -= 9
    return sum(digits) % 10 == 0


def _is_pii(value: str) -> bool:
    v = str(value).replace(" ", "").replace("-", "")
    if v.isdigit() and len(v) in (13, 14, 15, 16, 19) and _luhn_check(v):
        return True
    if re.match(r"^\d{3}-\d{2}-\d{4}$", str(value)):
        return True
    return False


def generate_numeric_values(min_val: float, max_val: float) -> List[Any]:
    candidates = [min_val, max_val, min_val - 1, max_val + 1, 0,
                  (min_val + max_val) / 2, (min_val + max_val) / 3]
    return [v for v in candidates if not _is_pii(str(int(v))) ]


def generate_string_values(max_length: int = 255) -> List[str]:
    candidates = [
        "",
        "a",
        "A" * max_length,
        "A" * (max_length + 1),
        "test@#$%^&*()",
        "normal_value",
    ]
    return [v for v in candidates if not _is_pii(v)]


def generate_enum_values(valid_values: List[str]) -> List[str]:
    invalid = "INVALID_OPTION_XYZ"
    return list(valid_values) + [invalid]


class DataConstraintEngine:
    def __init__(self, domain_config: dict = None):
        self.config = domain_config or {}

    def synthesize_column(self, col_name: str, col_type: str = "string", **kwargs) -> List[Any]:
        col_lower = col_name.lower()
        field_config = self.config.get(col_lower, {})

        if col_type == "numeric" or field_config.get("type") == "numeric":
            min_v = field_config.get("min", kwargs.get("min", 0))
            max_v = field_config.get("max", kwargs.get("max", 1000))
            return generate_numeric_values(min_v, max_v)

        if col_type == "enum" or "valid_values" in field_config:
            valid = field_config.get("valid_values", kwargs.get("valid_values", ["value1", "value2"]))
            return generate_enum_values(valid)

        max_len = field_config.get("max_length", kwargs.get("max_length", 255))
        values = generate_string_values(max_len)
        if field_config.get("optional"):
            values.append(None)
        return values
