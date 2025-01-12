<%--
  ~ Copyright (c) 2016, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
  ~
  ~  WSO2 LLC. licenses this file to you under the Apache License,
  ~  Version 2.0 (the "License"); you may not use this file except
  ~  in compliance with the License.
  ~  You may obtain a copy of the License at
  ~
  ~    http://www.apache.org/licenses/LICENSE-2.0
  ~
  ~ Unless required by applicable law or agreed to in writing,
  ~ software distributed under the License is distributed on an
  ~ "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  ~ KIND, either express or implied.  See the License for the
  ~ specific language governing permissions and limitations
  ~ under the License.
--%>

<%@ page contentType="text/html;charset=UTF-8" language="java" %>

<%@ page import="org.apache.commons.collections.map.HashedMap" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.IdentityManagementEndpointConstants" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.IdentityManagementEndpointUtil" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.IdentityManagementServiceUtil" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.ApiException" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.api.SecurityQuestionApi" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.model.AnswerVerificationRequest" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.model.InitiateAllQuestionResponse" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.model.InitiateQuestionResponse" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.model.Question" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.model.RetryError" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.model.SecurityAnswer" %>
<%@ page import="org.wso2.carbon.identity.mgt.endpoint.util.client.model.User" %>
<%@ page import="java.util.ArrayList" %>
<%@ page import="java.util.List" %>
<%@ page import="java.util.Map" %>
<jsp:directive.include file="includes/localize.jsp"/>

<%
    String userName = request.getParameter("username");
    String securityQuestionAnswer = request.getParameter("securityQuestionAnswer");
    String sessionDataKey = request.getParameter("sessionDataKey");

    if ( request.getParameter("callback") != null) {
        session.setAttribute("callback", request.getParameter("callback"));
    }
    if (request.getParameter("username") != null) {
        session.setAttribute("username", request.getParameter("username"));
    }

    if (request.getParameter("sessionDataKey") != null) {
        session.setAttribute("sessionDataKey", request.getParameter("sessionDataKey"));
    }

    if (userName != null) {
        //Initiate Challenge Question flow with one by one questions

        User user = IdentityManagementServiceUtil.getInstance().getUser(userName);
        session.setAttribute(IdentityManagementEndpointConstants.TENANT_DOMAIN, user.getTenantDomain());

        try {
            Map<String, String> requestHeaders = new HashedMap();
            if (request.getParameter("g-recaptcha-response") != null) {
                requestHeaders.put("g-recaptcha-response", request.getParameter("g-recaptcha-response"));
            }

            SecurityQuestionApi securityQuestionApi = new SecurityQuestionApi();
            InitiateQuestionResponse initiateQuestionResponse = securityQuestionApi.securityQuestionGet(
                    user.getUsername(), user.getRealm(), user.getTenantDomain(), requestHeaders);
            IdentityManagementEndpointUtil.addReCaptchaHeaders(request, securityQuestionApi.getApiClient().getResponseHeaders());
            session.setAttribute("initiateChallengeQuestionResponse", initiateQuestionResponse);
            request.getRequestDispatcher("/viewsecurityquestions.do").forward(request, response);
        } catch (ApiException e) {
            if (e.getCode() == 204) {
                request.setAttribute("error", true);
                request.setAttribute("errorMsg", IdentityManagementEndpointUtil.i18n(recoveryResourceBundle,
                        "No.security.questions.found.to.recover.password.contact.system.administrator"));
                request.setAttribute("errorCode", "18017");
                request.setAttribute("username", userName);
                request.getRequestDispatcher("error.jsp").forward(request, response);
                return;
            }
            IdentityManagementEndpointUtil.addReCaptchaHeaders(request, e.getResponseHeaders());
            IdentityManagementEndpointUtil.addErrorInformation(request, e);
            request.setAttribute("username", userName);
            request.getRequestDispatcher("error.jsp").forward(request, response);
            return;
        }

    } else if (securityQuestionAnswer != null) {

        InitiateQuestionResponse challengeQuestionResponse = (InitiateQuestionResponse)
                session.getAttribute("initiateChallengeQuestionResponse");


        List<SecurityAnswer> securityAnswers = new ArrayList<SecurityAnswer>();
        SecurityAnswer securityAnswer = new SecurityAnswer();
        securityAnswer.setQuestionSetId(challengeQuestionResponse.getQuestion().getQuestionSetId());
        securityAnswer.setAnswer(securityQuestionAnswer);

        securityAnswers.add(securityAnswer);

        AnswerVerificationRequest answerVerificationRequest = new AnswerVerificationRequest();
        answerVerificationRequest.setKey(challengeQuestionResponse.getKey());
        answerVerificationRequest.setAnswers(securityAnswers);

        Map<String, String> requestHeaders = new HashedMap();
        if(request.getParameter("g-recaptcha-response") != null) {
            requestHeaders.put("g-recaptcha-response", request.getParameter("g-recaptcha-response"));
        }

        try {
            SecurityQuestionApi securityQuestionApi = new SecurityQuestionApi();
            InitiateQuestionResponse initiateQuestionResponse =
                    securityQuestionApi.validateAnswerPost(answerVerificationRequest, requestHeaders);

            if ("validate-answer".equalsIgnoreCase(initiateQuestionResponse.getLink().getRel())) {
                session.setAttribute("initiateChallengeQuestionResponse", initiateQuestionResponse);
                request.getRequestDispatcher("/viewsecurityquestions.do").forward(request, response);
            } else if ("set-password".equalsIgnoreCase(initiateQuestionResponse.getLink().getRel())) {
                session.setAttribute("confirmationKey", initiateQuestionResponse.getKey());
                request.setAttribute("callback", session.getAttribute("callback"));
                request.setAttribute("username", session.getAttribute("username"));
                request.setAttribute("sessionDataKey", session.getAttribute("sessionDataKey"));
                session.removeAttribute("callback");
                session.removeAttribute("username");
                session.removeAttribute("sessionDataKey");
                request.getRequestDispatcher("password-reset.jsp").forward(request, response);
            }

        } catch (ApiException e) {
            RetryError retryError = IdentityManagementEndpointUtil.buildRetryError(e);
            if (retryError != null && "20008".equals(retryError.getCode())) {
                IdentityManagementEndpointUtil.addReCaptchaHeaders(request, e.getResponseHeaders());
                request.setAttribute("errorResponse", retryError);
                request.getRequestDispatcher("/viewsecurityquestions.do").forward(request, response);
                return;
            }

            request.setAttribute("error", true);
            if (retryError != null) {
                request.setAttribute("errorMsg", retryError.getDescription());
                request.setAttribute("errorCode", retryError.getCode());
            }

            request.setAttribute("username", userName);
            request.getRequestDispatcher("error.jsp").forward(request, response);
            return;
        }

    } else if (Boolean.parseBoolean(application.getInitParameter(IdentityManagementEndpointConstants
            .ConfigConstants.PROCESS_ALL_SECURITY_QUESTIONS))) {

        //Process security questions at once

        InitiateAllQuestionResponse initiateAllQuestionResponse =
                (InitiateAllQuestionResponse) session.getAttribute("initiateAllQuestionResponse");
        List<Question> challengeQuestions = initiateAllQuestionResponse.getQuestions();

        List<SecurityAnswer> securityAnswers = new ArrayList<SecurityAnswer>();
        for (int i = 0; i < challengeQuestions.size(); i++) {

            SecurityAnswer userChallengeAnswer = new SecurityAnswer();
            userChallengeAnswer.setQuestionSetId(challengeQuestions.get(i).getQuestionSetId());
            userChallengeAnswer.setAnswer(request.getParameter(challengeQuestions.get(i).getQuestionSetId()));
            securityAnswers.add(userChallengeAnswer);

        }

        Map<String, String> requestHeaders = new HashedMap();
        if(request.getParameter("g-recaptcha-response") != null) {
            requestHeaders.put("g-recaptcha-response", request.getParameter("g-recaptcha-response"));
        }


        AnswerVerificationRequest answerVerificationRequest = new AnswerVerificationRequest();
        answerVerificationRequest.setKey(initiateAllQuestionResponse.getKey());
        answerVerificationRequest.setAnswers(securityAnswers);


        try {
            SecurityQuestionApi securityQuestionApi = new SecurityQuestionApi();
            InitiateQuestionResponse initiateQuestionResponse =
                    securityQuestionApi.validateAnswerPost(answerVerificationRequest, requestHeaders);

            session.setAttribute("confirmationKey", initiateQuestionResponse.getKey());
            request.getRequestDispatcher("password-reset.jsp").forward(request, response);

        } catch (ApiException e) {
            RetryError retryError = IdentityManagementEndpointUtil.buildRetryError(e);
            if (retryError != null && "20008".equals(retryError.getCode())) {
                IdentityManagementEndpointUtil.addReCaptchaHeaders(request, e.getResponseHeaders());
                request.setAttribute("errorResponse", retryError);
                request.getRequestDispatcher("challenge-questions-view-all.jsp").forward(request, response);
                return;
            }

            request.setAttribute("error", true);
            if (retryError != null) {
                request.setAttribute("errorMsg", retryError.getDescription());
                request.setAttribute("errorCode", retryError.getCode());
            }

            request.setAttribute("username", userName);
            request.getRequestDispatcher("error.jsp").forward(request, response);
            return;
        }
    }

%>
