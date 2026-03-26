"""80+ Tosca action keyword → Playwright code snippet mapping."""

KEYWORD_MAP = {
    # Navigation
    "NavigateToUrl": "await page.goto('{value}');",
    "Navigate": "await page.goto('{value}');",
    "GoToUrl": "await page.goto('{value}');",
    "GoBack": "await page.goBack();",
    "GoForward": "await page.goForward();",
    "Reload": "await page.reload();",
    "RefreshPage": "await page.reload();",

    # Click actions
    "ClickAction": "await page.locator('{locator}').click();",
    "Click": "await page.locator('{locator}').click();",
    "DoubleClick": "await page.locator('{locator}').dblclick();",
    "RightClick": "await page.locator('{locator}').click({{ button: 'right' }});",
    "ClickButton": "await page.getByRole('button', {{ name: '{value}' }}).click();",
    "ClickLink": "await page.getByRole('link', {{ name: '{value}' }}).click();",
    "ClickCheckbox": "await page.locator('{locator}').check();",
    "UncheckCheckbox": "await page.locator('{locator}').uncheck();",
    "ClickRadio": "await page.locator('{locator}').check();",
    "Submit": "await page.locator('{locator}').press('Enter');",
    "PressKey": "await page.keyboard.press('{value}');",
    "PressEnter": "await page.keyboard.press('Enter');",
    "PressTab": "await page.keyboard.press('Tab');",
    "PressEscape": "await page.keyboard.press('Escape');",

    # Input
    "InputValue": "await page.locator('{locator}').fill('{value}');",
    "Input": "await page.locator('{locator}').fill('{value}');",
    "TypeText": "await page.locator('{locator}').type('{value}');",
    "ClearInput": "await page.locator('{locator}').clear();",
    "FillField": "await page.locator('{locator}').fill('{value}');",
    "SetValue": "await page.locator('{locator}').fill('{value}');",
    "EnterText": "await page.locator('{locator}').fill('{value}');",
    "AppendText": "await page.locator('{locator}').type('{value}');",
    "UploadFile": "await page.locator('{locator}').setInputFiles('{value}');",

    # Select / Dropdowns
    "SelectValue": "await page.locator('{locator}').selectOption('{value}');",
    "Select": "await page.locator('{locator}').selectOption('{value}');",
    "SelectOption": "await page.locator('{locator}').selectOption('{value}');",
    "SelectByText": "await page.locator('{locator}').selectOption({{ label: '{value}' }});",
    "SelectByIndex": "await page.locator('{locator}').selectOption({{ index: {value} }});",
    "SelectByValue": "await page.locator('{locator}').selectOption({{ value: '{value}' }});",
    "MultiSelect": "await page.locator('{locator}').selectOption(['{value}']);",

    # Verification / Assertions
    "VerifyValue": "await expect(page.locator('{locator}')).toHaveValue('{value}');",
    "VerifyExists": "await expect(page.locator('{locator}')).toBeVisible();",
    "Verify": "await expect(page.locator('{locator}')).toBeVisible();",
    "VerifyText": "await expect(page.locator('{locator}')).toHaveText('{value}');",
    "VerifyContainsText": "await expect(page.locator('{locator}')).toContainText('{value}');",
    "VerifyNotExists": "await expect(page.locator('{locator}')).toBeHidden();",
    "VerifyEnabled": "await expect(page.locator('{locator}')).toBeEnabled();",
    "VerifyDisabled": "await expect(page.locator('{locator}')).toBeDisabled();",
    "VerifyChecked": "await expect(page.locator('{locator}')).toBeChecked();",
    "VerifyUnchecked": "await expect(page.locator('{locator}')).not.toBeChecked();",
    "VerifyAttribute": "await expect(page.locator('{locator}')).toHaveAttribute('{value}');",
    "VerifyTitle": "await expect(page).toHaveTitle('{value}');",
    "VerifyUrl": "await expect(page).toHaveURL('{value}');",
    "AssertEquals": "await expect(page.locator('{locator}')).toHaveText('{value}');",
    "AssertNotEquals": "await expect(page.locator('{locator}')).not.toHaveText('{value}');",
    "AssertContains": "await expect(page.locator('{locator}')).toContainText('{value}');",
    "AssertVisible": "await expect(page.locator('{locator}')).toBeVisible();",
    "AssertHidden": "await expect(page.locator('{locator}')).toBeHidden();",

    # Wait
    "WaitForElement": "await page.waitForSelector('{locator}');",
    "WaitForVisible": "await page.locator('{locator}').waitFor({{ state: 'visible' }});",
    "WaitForHidden": "await page.locator('{locator}').waitFor({{ state: 'hidden' }});",
    "WaitForNavigation": "await page.waitForNavigation();",
    "WaitForLoadState": "await page.waitForLoadState('networkidle');",
    "WaitForTimeout": "await page.waitForTimeout({value});",
    "WaitSeconds": "await page.waitForTimeout({value} * 1000);",
    "SleepAction": "await page.waitForTimeout({value});",

    # Scroll
    "ScrollTo": "await page.locator('{locator}').scrollIntoViewIfNeeded();",
    "ScrollIntoView": "await page.locator('{locator}').scrollIntoViewIfNeeded();",
    "ScrollDown": "await page.evaluate('window.scrollBy(0, 500)');",
    "ScrollUp": "await page.evaluate('window.scrollBy(0, -500)');",
    "ScrollToTop": "await page.evaluate('window.scrollTo(0, 0)');",
    "ScrollToBottom": "await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');",

    # Get / Extract
    "GetText": "const text_{step_id} = await page.locator('{locator}').textContent();",
    "GetValue": "const value_{step_id} = await page.locator('{locator}').inputValue();",
    "GetAttribute": "const attr_{step_id} = await page.locator('{locator}').getAttribute('{value}');",
    "GetTitle": "const title_{step_id} = await page.title();",
    "GetUrl": "const url_{step_id} = page.url();",

    # Screenshot / Visual
    "TakeScreenshot": "await page.screenshot({{ path: 'screenshot_{step_id}.png' }});",
    "Screenshot": "await page.screenshot({{ path: 'screenshot_{step_id}.png' }});",
    "FullPageScreenshot": "await page.screenshot({{ path: 'screenshot_{step_id}.png', fullPage: true }});",

    # Hover / Focus
    "Hover": "await page.locator('{locator}').hover();",
    "HoverAction": "await page.locator('{locator}').hover();",
    "Focus": "await page.locator('{locator}').focus();",
    "Blur": "await page.locator('{locator}').blur();",

    # Frames / Windows
    "SwitchToFrame": "const frame_{step_id} = page.frameLocator('{locator}');",
    "SwitchToWindow": "// Switch to new page handled via page event",
    "CloseWindow": "await page.close();",

    # Drag & Drop
    "DragAndDrop": "await page.locator('{locator}').dragTo(page.locator('{value}'));",
    "DragDrop": "await page.locator('{locator}').dragTo(page.locator('{value}'));",

    # Cookie / Storage
    "DeleteCookies": "await page.context().clearCookies();",
    "ClearStorage": "await page.evaluate('localStorage.clear()');",

    # Alert / Dialog
    "AcceptAlert": "page.on('dialog', d => d.accept()); // set before triggering alert",
    "DismissAlert": "page.on('dialog', d => d.dismiss()); // set before triggering alert",
}


def map_action(action_mode: str) -> str | None:
    return KEYWORD_MAP.get(action_mode)
