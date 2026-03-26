import base64
import xml.etree.ElementTree as ET
from typing import List
from fastapi import HTTPException


def parse_tosca_xml(file_content_b64: str) -> tuple[str, List[dict]]:
    """Decode base64, parse XML, return (root_tag, IR steps list)."""
    try:
        xml_bytes = base64.b64decode(file_content_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 encoding")

    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as e:
        raise HTTPException(status_code=400, detail=f"Invalid XML: {e}")

    root_tag = root.tag.split("}")[-1] if "}" in root.tag else root.tag
    if root_tag not in ("TestCase", "TestSuite"):
        raise HTTPException(status_code=400, detail=f"Root element must be TestCase or TestSuite, got: {root_tag}")

    steps = []
    for i, step_el in enumerate(_find_steps(root)):
        action_mode = (
            step_el.get("ActionMode")
            or step_el.findtext("ActionMode")
            or step_el.get("action")
            or ""
        )
        element_path = (
            step_el.get("Path")
            or step_el.findtext("Path")
            or step_el.get("selector")
            or ""
        )
        input_value = (
            step_el.get("Value")
            or step_el.findtext("Value")
            or step_el.get("inputValue")
            or ""
        )
        expected_value = (
            step_el.get("ExpectedValue")
            or step_el.findtext("ExpectedValue")
            or ""
        )
        step_id = step_el.get("id") or step_el.get("Id") or f"step_{i + 1}"
        steps.append({
            "step_id": step_id,
            "action_mode": action_mode,
            "element_path": element_path,
            "input_value": input_value,
            "expected_value": expected_value,
            "step_order": i + 1,
        })

    return root_tag, steps


def _find_steps(root: ET.Element) -> List[ET.Element]:
    steps = root.findall(".//TestStep")
    if not steps:
        steps = root.findall(".//Step")
    if not steps:
        steps = root.findall(".//Action")
    return steps
