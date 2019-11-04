/**
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { fireEvent, render } from "../../../../../test_configs/test-utils";
import constants from "./constants";
import testForm from "./test-form";

describe("Test if the FormWrapper is working fine", () => {

    test("Test if the input type text works fine", () => {

        const { getByText, getByPlaceholderText, getByDisplayValue } = render(testForm);

        // checks if the label is displayed
        expect(getByText(constants.TEXT_BOX_LABEL)).toBeInTheDocument();

        // checks if the text box with the mentioned placeholder value is displayed
        expect(getByPlaceholderText(constants.TEXT_BOX_PLACEHOLDER)).toBeInTheDocument();

        // checks if the submit button is displayed
        expect(getByText(constants.SUBMIT)).toBeInTheDocument();

        // checks if the textbox with the mentioned value is displayed
        const textBox = getByDisplayValue(constants.TEXT_BOX_VALUE);
        expect(textBox).toBeInTheDocument();

        // check if the value of the textbox changes
        const NEW_VALUE = "new value";
        fireEvent.change(textBox, { target: { value: NEW_VALUE } });
        expect(getByDisplayValue(NEW_VALUE)).toBeInTheDocument();

        // checks if validation is working fine
        fireEvent.change(textBox, { target: { value: "wrong value" } });
        fireEvent.blur(textBox);
        fireEvent.click(getByText(constants.SUBMIT));
        expect(getByText(constants.TEXT_BOX_VALIDATION_FAILED)).toBeInTheDocument();

        // checks if required error message if correctly displayed
        fireEvent.change(textBox, { target: { value: "" } });
        fireEvent.blur(textBox);
        fireEvent.click(getByText(constants.SUBMIT));
        expect(getByText(constants.TEXT_BOX_REQUIRED_MESSAGE)).toBeInTheDocument();

        // checks if submit is working fine
        fireEvent.change(textBox, { target: { value: constants.TEXT_BOX_VALID_MESSAGE } });
        fireEvent.blur(textBox);
        fireEvent.click(getByText(constants.SUBMIT));
        expect(constants.onSubmit).toHaveBeenCalledTimes(1);
        expect(constants.onSubmit.mock.calls[0][0].get(constants.TEXT_BOX_NAME)).toBe(constants.TEXT_BOX_VALID_MESSAGE);
    });

    test("Test if the input type password works fine", () => {

        const { container, getByText, getByPlaceholderText, getByDisplayValue } = render(testForm);

        // checks if the label is displayed
        expect(getByText(constants.PASSWORD_LABEL)).toBeInTheDocument();

        // checks if the password box with the mentioned placeholder value is displayed
        expect(getByPlaceholderText(constants.PASSWORD_PLACEHOLDER)).toBeInTheDocument();

        // checks if the submit button is displayed
        expect(getByText(constants.SUBMIT)).toBeInTheDocument();

        // checks if the password box with the mentioned value is displayed
        const passwordBox = getByDisplayValue(constants.PASSWORD_VALUE);
        expect(passwordBox).toBeInTheDocument();

        // check if the value of the password box changes
        const NEW_VALUE = "new value";
        fireEvent.change(passwordBox, { target: { value: NEW_VALUE } });
        expect(getByDisplayValue(NEW_VALUE)).toBeInTheDocument();

        // checks if validation is working fine
        fireEvent.change(passwordBox, { target: { value: "wrong value" } });
        fireEvent.blur(passwordBox);
        fireEvent.click(getByText(constants.SUBMIT));
        expect(getByText(constants.PASSWORD_VALIDATION_FAILED)).toBeInTheDocument();

        // checks if show/hide is working fine
        let showButton = container.getElementsByClassName("eye link icon")[0];
        expect(passwordBox).toHaveAttribute("type", "password");
        expect(showButton).toBeInTheDocument();

        // click on the show icon
        fireEvent.click(showButton);

        const hideButton = container.getElementsByClassName("eye slash link icon")[0];
        expect(passwordBox).toHaveAttribute("type", "text");
        expect(showButton).toBeInTheDocument();

        // click on the show button
        fireEvent.click(hideButton);
        showButton = container.getElementsByClassName("eye link icon")[0];
        expect(passwordBox).toHaveAttribute("type", "password");
        expect(showButton).toBeInTheDocument();

        // check if the show/hide button is disabled
        fireEvent.change(passwordBox, { target: { value: "" } });
        expect(container.getElementsByClassName("eye disabled link icon")[0]).toBeInTheDocument();

        // checks if required error message if correctly displayed
        fireEvent.change(passwordBox, { target: { value: "" } });
        fireEvent.blur(passwordBox);
        fireEvent.click(getByText(constants.SUBMIT));
        expect(getByText(constants.PASSWORD_REQUIRED_MESSAGE)).toBeInTheDocument();

        // checks if submit is working fine
        fireEvent.change(passwordBox, { target: { value: constants.PASSWORD_VALID_MESSAGE } });
        fireEvent.blur(passwordBox);
        fireEvent.click(getByText(constants.SUBMIT));
        expect(constants.onSubmit).toHaveBeenCalledTimes(2);
        expect(constants.onSubmit.mock.calls[1][0].get(constants.PASSWORD_NAME)).toBe(constants.PASSWORD_VALID_MESSAGE);
    });

});
