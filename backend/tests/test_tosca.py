import base64
import pytest
from app.agents.tosca_convert.parser import parse_tosca_xml
from app.agents.tosca_convert.mapper import map_action


VALID_XML = """<?xml version="1.0"?>
<TestCase>
  <TestStep id="step_1" ActionMode="NavigateToUrl" Path="" Value="https://example.com"/>
  <TestStep id="step_2" ActionMode="Click" Path="//button[@id='submit']" Value=""/>
  <TestStep id="step_3" ActionMode="InputValue" Path="//input[@name='email']" Value="test@test.com"/>
  <TestStep id="step_4" ActionMode="VerifyExists" Path="//div[@class='success']" Value=""/>
</TestCase>
"""


def _encode(xml: str) -> str:
    return base64.b64encode(xml.encode()).decode()


def test_parse_valid_xml():
    root_tag, steps = parse_tosca_xml(_encode(VALID_XML))
    assert root_tag == "TestCase"
    assert len(steps) == 4
    assert steps[0]["action_mode"] == "NavigateToUrl"
    assert steps[1]["action_mode"] == "Click"
    assert steps[2]["action_mode"] == "InputValue"
    assert steps[3]["action_mode"] == "VerifyExists"


def test_parse_step_fields():
    _, steps = parse_tosca_xml(_encode(VALID_XML))
    s = steps[2]
    assert s["step_id"] == "step_3"
    assert s["element_path"] == "//input[@name='email']"
    assert s["input_value"] == "test@test.com"
    assert s["step_order"] == 3


def test_invalid_base64_raises():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        parse_tosca_xml("not-valid-base64!!!")
    assert exc_info.value.status_code == 400


def test_invalid_root_element_raises():
    from fastapi import HTTPException
    xml = "<WrongRoot><TestStep/></WrongRoot>"
    with pytest.raises(HTTPException) as exc_info:
        parse_tosca_xml(_encode(xml))
    assert exc_info.value.status_code == 400


def test_mapper_known_actions():
    assert map_action("NavigateToUrl") is not None
    assert map_action("Click") is not None
    assert map_action("InputValue") is not None
    assert map_action("VerifyExists") is not None
    assert map_action("WaitForElement") is not None
    assert map_action("SelectValue") is not None
    assert map_action("TakeScreenshot") is not None
    assert map_action("ScrollTo") is not None


def test_mapper_unknown_action():
    assert map_action("SomeObscureUnknownAction") is None


def test_mapper_covers_80_plus_keywords():
    from app.agents.tosca_convert.mapper import KEYWORD_MAP
    assert len(KEYWORD_MAP) >= 80
