/**
 * Copyright (c) 2020, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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

import { IdentityAppsApiException } from "@wso2is/core/exceptions";
import { AxiosHttpClient } from "@wso2is/http";
import { AxiosError, AxiosResponse } from "axios";
import { IdentityProviderManagementConstants } from "../constants";
import {
    FederatedAuthenticatorListItemInterface,
    FederatedAuthenticatorMetaInterface,
    HttpMethods,
    IdentityProviderClaimsInterface,
    IdentityProviderInterface,
    IdentityProviderListResponseInterface,
    IdentityProviderResponseInterface,
    IdentityProviderRolesInterface,
    IdentityProviderTemplateListItemInterface,
    IdentityProviderTemplateListResponseInterface,
    JITProvisioningResponseInterface,
    LocalAuthenticatorInterface,
    OutboundProvisioningConnectorInterface,
    OutboundProvisioningConnectorListItemInterface,
    OutboundProvisioningConnectorMetaInterface
} from "../models";
import { store } from "../store";

/**
 * Get an axios instance.
 *
 * @type {AxiosHttpClientInstance}.
 */
const httpClient = AxiosHttpClient.getInstance();

/**
 * Creates Identity Provider.
 *
 * @param identityProvider Identity provider settings data.
 */
export const createIdentityProvider = (identityProvider: object): Promise<any> => {
    const requestConfig = {
        data: identityProvider,
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.POST,
        url: store.getState().config.endpoints.identityProviders
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if ((response.status !== 201)) {
                return Promise.reject(new Error("Failed to create the application."));
            }
            return Promise.resolve(response);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Gets the IdP list with limit and offset.
 *
 * @param {number} limit - Maximum Limit of the IdP List.
 * @param {number} offset - Offset for get to start.
 * @param {string} filter - Search filter.
 * @param {string} requiredAttributes - Extra attribute to be included in the list response. ex:`isFederationHub`
 *
 * @return {Promise<IdentityProviderListResponseInterface>} A promise containing the response.
 */
export const getIdentityProviderList = (
    limit?: number,
    offset?: number,
    filter?: string,
    requiredAttributes?: string
): Promise<IdentityProviderListResponseInterface> => {

    const requestConfig = {
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.GET,
        params: {
            filter,
            limit,
            offset,
            requiredAttributes
        },
        url: store.getState().config.endpoints.identityProviders
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to get IdP list from: "));
            }
            return Promise.resolve(response.data as IdentityProviderListResponseInterface);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Gets detail about the Identity Provider.
 *
 * @param id Identity Provider Id.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const getIdentityProviderDetail = (id: string): Promise<any> => {
    const requestConfig = {
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.GET,
        url: store.getState().config.endpoints.identityProviders + "/" + id
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to get idp details from: "));
            }
            return Promise.resolve(response.data as IdentityProviderResponseInterface);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Deletes an IdP when the relevant id is passed in.
 *
 * @param id ID of the IdP.
 * @return {Promise<any>} A promise containing the response.
 */
export const deleteIdentityProvider = (id: string): Promise<any> => {
    const requestConfig = {
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.DELETE,
        url: store.getState().config.endpoints.identityProviders + "/" + id
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 204) {
                return Promise.reject(new Error("Failed to delete the identity provider."));
            }
            return Promise.resolve(response);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Update identity provider details.
 *
 * @param idp Identity Provider.
 * @return {Promise<any>} A promise containing the response.
 */
export const updateIdentityProviderDetails = (idp: IdentityProviderInterface): Promise<any> => {

    const { id, ...rest } = idp;
    const replaceOps = [];

    for (const key in rest) {
        replaceOps.push({
            "operation": "REPLACE",
            "path": "/" + key,
            "value": rest[key]
        });
    }

    const requestConfig = {
        data: replaceOps,
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.PATCH,
        url: store.getState().config.endpoints.identityProviders + "/" + id
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to update identity provider: " + id));
            }
            return Promise.resolve(response.data as IdentityProviderInterface);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Update a federated authenticator of a specified IDP.
 *
 * @param idpId ID of the Identity Provider.
 * @param authenticator Federated Authenticator.
 * @return {Promise<any>} A promise containing the response.
 */
export const updateFederatedAuthenticator = (
    idpId: string,
    authenticator: FederatedAuthenticatorListItemInterface
): Promise<any> => {

    const { authenticatorId, ...rest } = authenticator;

    const requestConfig = {
        data: rest,
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.PUT,
        url: store.getState().config.endpoints.identityProviders + "/" + idpId +
            "/federated-authenticators/" + authenticatorId
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to update identity provider: " + idpId));
            }
            return Promise.resolve(response.data as IdentityProviderInterface);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Get federated authenticator metadata.
 *
 * @param idpId ID of the Identity Provider.
 * @param authenticatorId ID of the Federated Authenticator.
 * @return {Promise<any>} A promise containing the response.
 */
export const getFederatedAuthenticatorDetails = (idpId: string, authenticatorId: string): Promise<any> => {

    const requestConfig = {
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.GET,
        url: store.getState().config.endpoints.identityProviders + "/" + idpId +
            "/federated-authenticators/" + authenticatorId
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(
                    new Error("Failed to get federated authenticator details for: " + authenticatorId)
                );
            }
            return Promise.resolve(response.data as FederatedAuthenticatorListItemInterface);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Get federated authenticator details.
 *
 * @param id ID of the Federated Authenticator.
 * @return {Promise<any>} A promise containing the response.
 */
export const getFederatedAuthenticatorMeta = (id: string): Promise<any> => {

    const requestConfig = {
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.GET,
        url: store.getState().config.endpoints.identityProviders + "/meta/federated-authenticators/" + id
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to get federated authenticator meta details for: " + id));
            }
            return Promise.resolve(response.data as FederatedAuthenticatorMetaInterface);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Get federated authenticator details.
 *
 * @return {Promise<any>} A promise containing the response.
 */
export const getFederatedAuthenticatorsList = (): Promise<any> => {

    const requestConfig = {
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.GET,
        url: store.getState().config.endpoints.identityProviders + "/meta/federated-authenticators"
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to get federated authenticators list"));
            }
            return Promise.resolve(response.data as FederatedAuthenticatorMetaInterface);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Get federated authenticator metadata.
 *
 * @param idpId ID of the Identity Provider.
 * @param authenticatorId ID of the Federated Authenticator.
 * @return {Promise<any>} A promise containing the response.
 */
export const getFederatedAuthenticatorMetadata = (authenticatorId: string): Promise<any> => {

    const requestConfig = {
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.GET,
        url: store.getState().config.endpoints.identityProviders + "/meta/federated-authenticators/" +
            authenticatorId
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to get federated authenticator metadata for: "
                    + authenticatorId));
            }

            return Promise.resolve(response.data as FederatedAuthenticatorMetaInterface);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Get outbound provisioning connector metadata.
 *
 * @param connectorId ID of the outbound provisioning connector.
 * @return {Promise<any>} A promise containing the response.
 */
export const getOutboundProvisioningConnectorMetadata = (connectorId: string): Promise<any> => {

    const requestConfig = {
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.GET,
        url: store.getState().config.endpoints.identityProviders + "/meta/outbound-provisioning-connectors/" +
            connectorId
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to get outbound provisioning connector metadata for: "
                    + connectorId));
            }

            return Promise.resolve(response.data as OutboundProvisioningConnectorMetaInterface);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Get outbound provisioning connector.
 *
 * @param idpId Identity provider ID.
 * @param connectorId ID of the outbound provisioning connector.
 * @return {Promise<any>} A promise containing the response.
 */
export const getOutboundProvisioningConnector = (idpId: string, connectorId: string): Promise<any> => {

    const requestConfig = {
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.GET,
        url: store.getState().config.endpoints.identityProviders + "/" + idpId + "/provisioning/outbound-connectors/"
            + connectorId
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to get outbound provisioning connector for: "
                    + connectorId));
            }

            return Promise.resolve(response.data as OutboundProvisioningConnectorInterface);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Update a outbound provisioning connector of a specified IDP.
 *
 * @param idpId ID of the Identity Provider.
 * @param connector Outbound provisioning connector.
 * @return {Promise<any>} A promise containing the response.
 */
export const updateOutboundProvisioningConnector = (
    idpId: string,
    connector: OutboundProvisioningConnectorInterface
): Promise<any> => {

    const { connectorId, ...rest } = connector;

    const requestConfig = {
        data: rest,
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.PUT,
        url: store.getState().config.endpoints.identityProviders + "/" + idpId +
            "/provisioning/outbound-connectors/" + connectorId
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to update identity provider: " + idpId));
            }
            return Promise.resolve(response.data as IdentityProviderInterface);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Update JIT provisioning configs of a specified IDP.
 *
 * @param idpId ID of the Identity Provider.
 * @param configs JIT provisioning configs.
 * @return {Promise<IdentityProviderInterface>} A promise containing the response.
 */
export const updateJITProvisioningConfigs = (
    idpId: string,
    configs: JITProvisioningResponseInterface
): Promise<IdentityProviderInterface> => {

    const requestConfig = {
        data: configs,
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.PUT,
        url: store.getState().config.endpoints.identityProviders + "/" + idpId +
            "/provisioning/jit"
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to update identity provider: " + idpId));
            }
            return Promise.resolve(response.data as IdentityProviderInterface);
        }).catch((error: AxiosError) => {
            throw new IdentityAppsApiException(
                IdentityProviderManagementConstants.IDENTITY_PROVIDER_JIT_PROVISIONING_UPDATE_ERROR,
                error.stack,
                error.code,
                error.request,
                error.response,
                error.config);
        });
};

/**
 * Update claims of a specified IDP.
 *
 * @param idpId ID of the Identity Provider.
 * @param configs Claims configs.
 * @return {Promise<IdentityProviderInterface>} A promise containing the response.
 */
export const updateClaimsConfigs = (
    idpId: string,
    configs: IdentityProviderClaimsInterface
): Promise<IdentityProviderInterface> => {

    const requestConfig = {
        data: configs,
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.PUT,
        url: store.getState().config.endpoints.identityProviders + "/" + idpId + "/claims"
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to update identity provider: " + idpId));
            }
            return Promise.resolve(response.data as IdentityProviderInterface);
        }).catch((error: AxiosError) => {
            throw new IdentityAppsApiException(
                IdentityProviderManagementConstants.IDENTITY_PROVIDER_CLAIMS_UPDATE_ERROR,
                error.stack,
                error.code,
                error.request,
                error.response,
                error.config);
        });
};

/**
 * Gets the identity provider template list with limit and offset.
 *
 * @param {number} limit - Maximum Limit of the identity provider template List.
 * @param {number} offset - Offset for get to start.
 * @param {string} filter - Search filter.
 *
 * @return {Promise<IdentityProviderTemplateListResponseInterface>} A promise containing the response.
 */
export const getIdentityProviderTemplateList = (limit?: number, offset?: number,
                                           filter?: string): Promise<IdentityProviderTemplateListResponseInterface> => {
    const requestConfig = {
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.GET,
        params: {
            filter,
            limit,
            offset
        },
        url: store.getState().config.endpoints.identityProviders + "/templates"
    };

    return httpClient.request(requestConfig)
        .then((response: AxiosResponse) => {
            if (response.status !== 200) {
                throw new IdentityAppsApiException(
                    IdentityProviderManagementConstants
                        .IDENTITY_PROVIDER_TEMPLATES_LIST_FETCH_INVALID_STATUS_CODE_ERROR,
                    null,
                    response.status,
                    response.request,
                    response,
                    response.config);
            }

            return Promise.resolve(response.data as IdentityProviderTemplateListResponseInterface);
        }).catch((error: AxiosError) => {
            throw new IdentityAppsApiException(
                IdentityProviderManagementConstants.IDENTITY_PROVIDER_TEMPLATES_LIST_FETCH_ERROR,
                error.stack,
                error.code,
                error.request,
                error.response,
                error.config);
        });
};

/**
 * Gets the identity provider template.
 *
 * @param templateId Id value of the template.
 * @return {Promise<IdentityProviderTemplateListItemInterface>} A promise containing the response.
 */
export const getIdentityProviderTemplate = (templateId: string): Promise<IdentityProviderTemplateListItemInterface> => {
    const requestConfig = {
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.GET,
        url: store.getState().config.endpoints.identityProviders + "/templates/" + templateId
    };

    return httpClient.request(requestConfig)
        .then((response: AxiosResponse) => {
            if (response.status !== 200) {
                throw new IdentityAppsApiException(
                    IdentityProviderManagementConstants
                        .IDENTITY_PROVIDER_TEMPLATE_FETCH_INVALID_STATUS_CODE_ERROR,
                    null,
                    response.status,
                    response.request,
                    response,
                    response.config);
            }

            return Promise.resolve(response.data as IdentityProviderTemplateListItemInterface);
        }).catch((error: AxiosError) => {
            throw new IdentityAppsApiException(
                IdentityProviderManagementConstants.IDENTITY_PROVIDER_TEMPLATE_FETCH_ERROR,
                error.stack,
                error.code,
                error.request,
                error.response,
                error.config);
        });
};

/**
 * Update role mappings of a specified IDP.
 *
 * @param idpId ID of the Identity Provider.
 * @param mappings IDP role mappings.
 * @return {Promise<any>} A promise containing the response.
 */
export const updateIDPRoleMappings = (
    idpId: string,
    mappings: IdentityProviderRolesInterface
): Promise<any> => {

    const requestConfig = {
        data: mappings,
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.PUT,
        url: store.getState().config.endpoints.identityProviders + "/" + idpId + "/roles"
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to update identity provider: " + idpId));
            }
            return Promise.resolve(response.data as IdentityProviderInterface);
        }).catch((error) => {
            return Promise.reject(error);
        });
};

/**
 * Get the list of local authenticators.
 *
 * @return {Promise<LocalAuthenticatorInterface[]>} Response as a promise.
 */
export const getLocalAuthenticators = (): Promise<LocalAuthenticatorInterface[]> => {

    const requestConfig = {
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.GET,
        url: store.getState().config.endpoints.localAuthenticators
    };

    return httpClient.request(requestConfig)
        .then((response: AxiosResponse) => {
            if (response.status !== 200) {
                throw new IdentityAppsApiException(
                    IdentityProviderManagementConstants.LOCAL_AUTHENTICATOR_FETCH_INVALID_STATUS_CODE_ERROR,
                    null,
                    response.status,
                    response.request,
                    response,
                    response.config);
            }

            return Promise.resolve(response.data as LocalAuthenticatorInterface[]);
        }).catch((error: AxiosError) => {
            throw new IdentityAppsApiException(
                IdentityProviderManagementConstants.LOCAL_AUTHENTICATOR_FETCH_INVALID_STATUS_CODE_ERROR,
                error.stack,
                error.code,
                error.request,
                error.response,
                error.config);
        });
};

/**
 * Fetch the list of outbound provisioning connectors.
 *
 * @return {Promise<any>} A promise containing the response.
 */
export const getOutboundProvisioningConnectorsList = (): Promise<any> => {
    const requestConfig = {
        headers: {
            "Accept": "application/json",
            "Access-Control-Allow-Origin": store.getState().config.deployment.clientHost,
            "Content-Type": "application/json"
        },
        method: HttpMethods.GET,
        url: store.getState().config.endpoints.identityProviders + "/meta/outbound-provisioning-connectors"
    };

    return httpClient.request(requestConfig)
        .then((response) => {
            if (response.status !== 200) {
                return Promise.reject(new Error("Failed to fetch outbound provisioning connectors"));
            }
            return Promise.resolve(response.data as OutboundProvisioningConnectorListItemInterface[]);
        }).catch((error) => {
            return Promise.reject(error);
        });
};
