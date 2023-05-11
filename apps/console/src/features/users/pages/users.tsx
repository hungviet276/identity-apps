/**
 * Copyright (c) 2020, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
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
import moment from 'moment';
import * as XLSX from 'xlsx';
import FileSaver, { saveAs } from "file-saver";
import axios, { AxiosRequestConfig } from 'axios';
import fs from 'fs';
import { HttpMethods } from "@wso2is/core/models";
import { AccessControlConstants, Show } from "@wso2is/access-control";
import { CommonHelpers } from "@wso2is/core/helpers";
import { 
    AlertInterface, 
    AlertLevels, 
    MultiValueAttributeInterface, 
    TestableComponentInterface } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { LocalStorageUtils } from "@wso2is/core/utils";
import {
    Button,
    EmptyPlaceholder,
    ListLayout,
    PageLayout,
    Popup,
    PrimaryButton
} from "@wso2is/react-components";
import { AxiosError, AxiosResponse } from "axios";
import React, { FunctionComponent, MutableRefObject, ReactElement, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch } from "redux";
import { Dropdown, DropdownProps, Icon, Input, PaginationProps } from "semantic-ui-react";
import {
    AdvancedSearchWithBasicFilters,
    AppState,
    FeatureConfigInterface,
    SharedUserStoreUtils,
    UIConstants,
    UserBasicInterface,
    getAUserStore,
    getEmptyPlaceholderIllustrations,
    store,
    UserInterface,
    AppConstants
} from "../../core";
import { RootOnlyComponent } from "../../organizations/components";
import { OrganizationUtils } from "../../organizations/utils";
import {
    ConnectorPropertyInterface,
    GovernanceConnectorCategoryInterface,
    GovernanceConnectorInterface,
    RealmConfigInterface,
    ServerConfigurationsConstants,
    ServerConfigurationsInterface,
    getConnectorCategory,
    getServerConfigs
} from "../../server-configurations";
import {
    CONSUMER_USERSTORE,
    UserStoreListItem,
    UserStorePostData,
    UserStoreProperty
} from "../../userstores";
import { getUserStoreList } from "../../userstores/api";
import { addUser, getUsersList } from "../api";
import { AddUserWizard, UsersList, UsersListOptionsComponent } from "../components";
import { UserManagementConstants } from "../constants";
import { AddUserWizardStateInterface, UserDetailsInterface, UserListInterface, createEmptyUserDetails } from "../models";
import { UserListTestInterface } from "../models";
import { SCIMConfigs } from 'apps/console/src/extensions';

interface UserStoreItem {
    key: number;
    text: string;
    value: string;
}

/**
 * Props for the Users page.
 */
type UsersPageInterface = TestableComponentInterface;

/**
 * Temporary value to append to the list limit to figure out if the next button is there.
 */
const TEMP_RESOURCE_LIST_ITEM_LIMIT_OFFSET: number = 1;

/**
 * Users info page.
 *
 * @param props - Props injected to the component.
 * @returns React Element
 */
const UsersPage: FunctionComponent<UsersPageInterface> = (
    props: UsersPageInterface
): ReactElement => {

    const {
        [ "data-testid" ]: testId
    } = props;

    const { t } = useTranslation();

    const dispatch: Dispatch<any> = useDispatch();

    const featureConfig: FeatureConfigInterface = useSelector((state: AppState) => state.config.ui.features);

    const [ searchQuery, setSearchQuery ] = useState<string>("");
    const [ listOffset, setListOffset ] = useState<number>(0);
    const [ listItemLimit, setListItemLimit ] = useState<number>(UIConstants.DEFAULT_RESOURCE_LIST_ITEM_LIMIT);
    const [ showWizard, setShowWizard ] = useState<boolean>(false);
    const [ usersList, setUsersList ] = useState<UserListInterface>({});
    const [ rolesList ] = useState([]);
    const [ isListUpdated, setListUpdated ] = useState(false);
    const [ userListMetaContent, setUserListMetaContent ] = useState(undefined);
    const [ userStoreOptions, setUserStoresList ] = useState([]);
    const [ userStore, setUserStore ] = useState(undefined);
    const [ triggerClearQuery, setTriggerClearQuery ] = useState<boolean>(false);
    const [ isUserListRequestLoading, setUserListRequestLoading ] = useState<boolean>(false);
    const [ readOnlyUserStoresList, setReadOnlyUserStoresList ] = useState<string[]>(undefined);
    const [ userStoreError, setUserStoreError ] = useState(false);
    const [ emailVerificationEnabled, setEmailVerificationEnabled ] = useState<boolean>(undefined);
    const [ isNextPageAvailable, setIsNextPageAvailable ] = useState<boolean>(undefined);
    const [ realmConfigs, setRealmConfigs ] = useState<RealmConfigInterface>(undefined);
    const [ usersBasisList, setUsersBasicList ] = useState<UserListTestInterface[]>([]);
    const [ usersBasisTestList, setUsersBasicTestList ] = useState<UserListTestInterface[]>([]);
    const [ isUserListLoading, setUserListLoading ] = useState<boolean>(false);
    const init : MutableRefObject<boolean> = useRef(true);

    const username: string = useSelector((state: AppState) => state.auth.username);
    const tenantName: string = store.getState().config.deployment.tenant;
    const tenantSettings: Record<string, any> = JSON.parse(LocalStorageUtils.getValueFromLocalStorage(tenantName));

    const getList = (limit: number, offset: number, filter: string, attribute: string, domain: string) => {
        setUserListRequestLoading(true);

        const modifiedLimit : number = limit + TEMP_RESOURCE_LIST_ITEM_LIMIT_OFFSET;

        getUsersList(modifiedLimit, offset, filter, attribute, domain)
            .then((response: UserListInterface) => {
                const data: UserListInterface = { ...response };

                data.Resources = data?.Resources?.map((resource: UserBasicInterface) => {
                    const userStore: string = resource.userName.split("/").length > 1
                        ? resource.userName.split("/")[0]
                        : "Primary";

                    if (userStore !== CONSUMER_USERSTORE) {
                        let email: string = null;

                        if (resource?.emails instanceof Array) {
                            const emailElement: string | MultiValueAttributeInterface = resource?.emails[0];

                            if (typeof emailElement === "string") {
                                email = emailElement;
                            } else {
                                email = emailElement?.value;
                            }
                        }

                        resource.emails = [ email ];

                        return resource;
                    } else {
                        const resources: UserBasicInterface[] = [ ...data.Resources ];

                        resources.splice(resources.indexOf(resource), 1);
                        data.Resources = resources;
                    }
                });

                setUsersList(moderateUsersList(data, modifiedLimit, TEMP_RESOURCE_LIST_ITEM_LIMIT_OFFSET));
                setUserStoreError(false);
            }).catch((error: AxiosError) => {
                if (error?.response?.data?.description) {
                    dispatch(addAlert({
                        description: error?.response?.data?.description ?? error?.response?.data?.detail
                            ?? t("console:manage.features.users.notifications.fetchUsers.error.description"),
                        level: AlertLevels.ERROR,
                        message: error?.response?.data?.message
                            ?? t("console:manage.features.users.notifications.fetchUsers.error.message")
                    }));

                    return;
                }

                dispatch(addAlert({
                    description: t("console:manage.features.users.notifications.fetchUsers.genericError." +
                        "description"),
                    level: AlertLevels.ERROR,
                    message: t("console:manage.features.users.notifications.fetchUsers.genericError.message")
                }));

                setUserStoreError(true);
                setUsersList({
                    Resources: [],
                    itemsPerPage: 10,
                    links: [],
                    startIndex: 1,
                    totalResults: 0
                });
            })
            .finally(() => {
                setUserListRequestLoading(false);
            });
    };

    const exportListUser = () => {
        const arrayUser = [];
        setUserListLoading(true);
        const limit = 1000;
        const offset = 0;
        const filter = null;
        const attribute = null;
        const domain = null;
        const modifiedLimit : number = limit + TEMP_RESOURCE_LIST_ITEM_LIMIT_OFFSET;
        let num : number = 0;

        getUsersList(modifiedLimit, offset, filter, attribute, domain)
            .then((response: UserListInterface) => {
                const data: UserListInterface = { ...response };
                data.Resources = data?.Resources?.map((resource: UserBasicInterface) => {
                  
                    num = num +1;
                    const familyName:string = "name" in resource?resource.name.familyName:"";           
                    const givenName:string = "name" in resource?resource.name.givenName:"";       
                    const roleStr = "roles" in resource ?resource.roles !== null ?resource.roles.reduce((acc, curr) => `${acc}${curr.display},` ,'').slice(0,-1):"":"";
                    const created = resource.meta.created !== undefined ?moment(resource.meta.created).format('DD/MM/YYYY HH:mm:ss'):"";           
                    const lastModified = resource.meta.lastModified !== undefined ?moment(resource.meta.lastModified).format('DD/MM/YYYY HH:mm:ss'):"";   
                    let emailStr: string| MultiValueAttributeInterface = null;
                    if (resource?.emails instanceof Array) {
                    emailStr = resource?.emails[0];
                    }
                    const groupStr = "groups" in resource ?resource.groups !== null ?resource.groups.reduce((acc, curr) => `${acc}${curr.display},` ,'').slice(0,-1):"":"";
                
                    const userTest: UserInterface = {
                        number: num,
                        id: resource.id,
                        userName: resource.userName,
                        familyName :familyName,
                        givenName : givenName,
                        email: emailStr,
                        roles: roleStr,
                        group: groupStr,
                        created: created,
                        lastModified: lastModified
                      };
              
                    // setUsersBasicList(usersBasisList => [
                    //     ...usersBasisList,
                    //     {    id: resource.id,
                    //         userName: resource.userName,
                    //         familyName :familyName,
                    //         givenName : givenName,
                    //         email: emailStr,
                    //         roles: roleStr,
                    //         group: groupStr,
                    //         created: created,
                    //         lastModified: lastModified}
                    //   ])
                      arrayUser.push(userTest)
                                    
                    const userStore: string = resource.userName.split("/").length > 1
                        ? resource.userName.split("/")[0]
                        : "Primary";

                    if (userStore !== CONSUMER_USERSTORE) {
                        let email: string = null;

                        if (resource?.emails instanceof Array) {
                            const emailElement: string | MultiValueAttributeInterface = resource?.emails[0];

                            if (typeof emailElement === "string") {
                                email = emailElement;
                            } else {
                                email = emailElement?.value;
                            }
                        }

                        resource.emails = [ email ];

                        return resource;
                    } else {
                        const resources: UserBasicInterface[] = [ ...data.Resources ];

                        resources.splice(resources.indexOf(resource), 1);
                        data.Resources = resources;
                    }
               
          
                });

                setUsersList(moderateUsersList(data, modifiedLimit, TEMP_RESOURCE_LIST_ITEM_LIMIT_OFFSET));
                setUserStoreError(false);
                const outputFilename = `list_user_${Date.now()}`;

                exportToCSV(arrayUser,outputFilename);
          
           
            }).catch((error: AxiosError) => {
                if (error?.response?.data?.description) {
                    dispatch(addAlert({
                        description: error?.response?.data?.description ?? error?.response?.data?.detail
                            ?? t("console:manage.features.users.notifications.fetchUsers.error.description"),
                        level: AlertLevels.ERROR,
                        message: error?.response?.data?.message
                            ?? t("console:manage.features.users.notifications.fetchUsers.error.message")
                    }));

                    return;
                }

                dispatch(addAlert({
                    description: t("console:manage.features.users.notifications.fetchUsers.genericError." +
                        "description"),
                    level: AlertLevels.ERROR,
                    message: t("console:manage.features.users.notifications.fetchUsers.genericError.message")
                }));

                setUserStoreError(true);
                setUsersList({
                    Resources: [],
                    itemsPerPage: 10,
                    links: [],
                    startIndex: 1,
                    totalResults: 0
                });
            })
            .finally(() => {
                setUserListLoading(false);
          
            });
    };

    
    const exportToCSV = (csvData, fileName) => {
        const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        const fileExtension = '.xlsx';

        const ws = XLSX.utils.json_to_sheet(csvData);
        const wb = {Sheets: {'data': ws}, SheetNames: ['data']};  
        const excelBuffer = XLSX.write(wb, {bookType: 'xlsx', type: 'array'});      
        
        // let readUTF8 = excelBuffer.toString('utf8')
        const data = new Blob([excelBuffer], {type: fileType});
        FileSaver.saveAs(data, fileName + fileExtension);
}

    const handleFile = async (e: any) => {
    const file = e.target.files[0];
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    let jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 2,
        defval: "",
    });

    jsonData = jsonData?.map((user: AddUserWizardStateInterface) => {
        addUserBasic(user);
    })
}

const addUserBasic = (userInfo: AddUserWizardStateInterface) => {
    let userName = "";

    userInfo.domain !== "primary"
        ? userName = userInfo.domain + "/" + userInfo.userName
        : userName = userInfo.userName;

    let userDetails: UserDetailsInterface = createEmptyUserDetails();
    const password = userInfo.newPassword;

    userInfo.passwordOption && userInfo.passwordOption !== "ask-password"
        ? (
            userDetails = {
                emails:[
                    {
                        primary: true,
                        value: userInfo.email
                    }
                ],
                name: {
                    familyName: userInfo.lastName,
                    givenName: userInfo.firstName
                },
                password,
                profileUrl: userInfo.profileUrl,
                userName
            }
        )
        : (
            userDetails = {
                emails: [
                    {
                        primary: true,
                        value: userInfo.email
                    }
                ],
                name: {
                    familyName: userInfo.lastName,
                    givenName: userInfo.firstName
                },
                password: userInfo.newPassword,
                profileUrl: userInfo.profileUrl,
                [SCIMConfigs.scim.enterpriseSchema] : {
                    askPassword: "true"
                },
                userName
            }
        );

  

    addUser(userDetails)
        .then((response) => {
            dispatch(addAlert({
                description: t(
                    "console:manage.features.users.notifications.addUser.success.description"
                ),
                level: AlertLevels.SUCCESS,
                message: t(
                    "console:manage.features.users.notifications.addUser.success.message"
                )
            }));


        })
        .catch((error) => {
            // Axios throws a generic `Network Error` for 401 status.
            // As a temporary solution, a check to see if a response
            // is available has be used.
            if (!error.response || error.response.status === 401) {
            
                dispatch(addAlert({
                    description: t(
                        "console:manage.features.users.notifications.addUser.error.description"
                    ),
                    level: AlertLevels.ERROR,
                    message: t(
                        "console:manage.features.users.notifications.addUser.error.message"
                    )
                }));
            } else if (error.response && error.response.data && error.response.data.detail) {
              
                dispatch(addAlert({
                    description: t(
                        "console:manage.features.users.notifications.addUser.error.description",
                        { description: error.response.data.detail }
                    ),
                    level: AlertLevels.ERROR,
                    message: t(
                        "console:manage.features.users.notifications.addUser.error.message"
                    )
                }));
            } else {
             
                // Generic error message
                dispatch(addAlert({
                    description: t(
                        "console:manage.features.users.notifications.addUser.genericError.description"
                    ),
                    level: AlertLevels.ERROR,
                    message: t(
                        "console:manage.features.users.notifications.addUser.genericError.message"
                    )
                }));
            }
        })
        
};


    useEffect(() => {
        if (init.current) {
            init.current = false;
        } else {
            if (emailVerificationEnabled !== undefined) {
                setShowWizard(true);
            }
        }
    }, [ emailVerificationEnabled ]);
useState
    useEffect(() => {
        if (!OrganizationUtils.isCurrentOrganizationRoot()) {
            return;
        }

        SharedUserStoreUtils.getReadOnlyUserStores().then((response: string[]) => {
            setReadOnlyUserStoresList(response);
        });
    }, [ userStore ]);

    useEffect(() => {
        if(CommonHelpers.lookupKey(tenantSettings, username) !== null) {
            const userSettings: Record<string, any> = CommonHelpers.lookupKey(tenantSettings, username);
            const userPreferences: Record<string, any> = userSettings[1];
            const tempColumns: Map<string, string> = new Map<string, string> ();

            if (userPreferences.identityAppsSettings.userPreferences.userListColumns.length < 1) {
                const metaColumns: string[] = UserManagementConstants.DEFAULT_USER_LIST_ATTRIBUTES;

                setUserMetaColumns(metaColumns);
                metaColumns.map((column: string) => {
                    if (column === "id") {
                        tempColumns.set(column, "");
                    } else {
                        tempColumns.set(column, column);
                    }
                });
                setUserListMetaContent(tempColumns);
            }
            userPreferences.identityAppsSettings.userPreferences.userListColumns.map((column: any) => {
                tempColumns.set(column, column);
            });
            setUserListMetaContent(tempColumns);
        }
    }, []);

    /**
     * Returns a moderated users list.
     *
     * @remarks There is no proper way to count the total entries in the userstore with LDAP. So as a workaround, when
     * fetching users, we request an extra entry to figure out if there is a next page.
     * TODO: Remove this function and other related variables once there is a proper fix for LDAP pagination.
     * @see {@link https://github.com/wso2/product-is/issues/7320}
     *
     * @param list - Users list retrieved from the API.
     * @param requestedLimit - Requested item limit.
     * @param popCount - Tempt count used which will be removed after figuring out if next page is available.
     * @returns UserListInterface
     */
    const moderateUsersList = (list: UserListInterface, requestedLimit: number,
        popCount: number = 1): UserListInterface => {

        const moderated: UserListInterface = list;

        if (moderated.itemsPerPage === requestedLimit) {
            moderated.Resources.splice(-1, popCount);
            setIsNextPageAvailable(true);
        } else {
            setIsNextPageAvailable(false);
        }

        return moderated;
    };

    /**
     * The following function fetch the userstore list and set it to the state.
     */
    const getUserStores = () => {
        const storeOptions: UserStoreItem[] = [
            {
                key: -2,
                text: t("console:manage.features.users.userstores.userstoreOptions.all"),
                value: "all"
            },
            {
                key: -1,
                text: t("console:manage.features.users.userstores.userstoreOptions.primary"),
                value: "primary"
            }
        ];

        let storeOption: UserStoreItem = {
            key: null,
            text: "",
            value: ""
        };

        getUserStoreList()
            .then((response: AxiosResponse<UserStoreListItem[]>) => {
                if (storeOptions.length === 0) {
                    storeOptions.push(storeOption);
                }
                response.data.map((store: UserStoreListItem, index: number) => {
                    if (store.name !== CONSUMER_USERSTORE) {
                        getAUserStore(store.id).then((response: UserStorePostData) => {
                            const isDisabled: boolean = response.properties.find(
                                (property: UserStoreProperty) => property.name === "Disabled")?.value === "true";

                            if (!isDisabled) {
                                storeOption = {
                                    key: index,
                                    text: store.name,
                                    value: store.name
                                };
                                storeOptions.push(storeOption);
                            }
                        });
                    }
                }
                );
                setUserStoresList(storeOptions);
            });

        setUserStoresList(storeOptions);
    };

    /**
     * The following method accepts a Map and returns the values as a string.
     *
     * @param attributeMap - IterableIterator<string>
     * @returns string
     */
    const generateAttributesString = (attributeMap: IterableIterator<string>) => {
        const attArray: any[] = [];
        const iterator1: IterableIterator<string> = attributeMap[Symbol.iterator]();

        for (const attribute of iterator1) {
            if (attribute !== "") {
                attArray.push(attribute);
            }
        }
        if (!attArray.includes(UserManagementConstants.SCIM2_SCHEMA_DICTIONARY.get("USERNAME"))) {
            attArray.push(UserManagementConstants.SCIM2_SCHEMA_DICTIONARY.get("USERNAME"));
        }

        return attArray.toString();
    };

    /**
     * Util method to get super admin
     */
    const getAdminUser = () => {
        getServerConfigs()
            .then((response: ServerConfigurationsInterface) => {
                setRealmConfigs(response?.realmConfig);
            });
    };

    /**
     * Fetch the list of available userstores.
     */
    useEffect(() => {
        if (!OrganizationUtils.isCurrentOrganizationRoot()) {
            return;
        }

        getUserStores();
        getAdminUser();
    }, []);

    useEffect(() => {
        const attributes: string = userListMetaContent ? generateAttributesString(userListMetaContent?.values()) : null;

        getList(listItemLimit, listOffset, null, attributes, userStore);
    }, [ userStore ]);

    useEffect(() => {
        if (userListMetaContent) {
            const attributes: string = generateAttributesString(userListMetaContent?.values());

            getList(listItemLimit, listOffset, null, attributes, userStore);
        }
    }, [ listOffset, listItemLimit ]);

    useEffect(() => {
        if (!isListUpdated) {
            return;
        }
        const attributes: string = generateAttributesString(userListMetaContent?.values());

        getList(listItemLimit, listOffset, null, attributes, userStore);
        setListUpdated(false);
    }, [ isListUpdated ]);

    /**
     * The following method set the user preferred columns to the local storage.
     *
     * @param metaColumns - string[]
     */
    const setUserMetaColumns = (metaColumns: string[]) => {
        if(CommonHelpers.lookupKey(tenantSettings, username) !== null) {
            const userSettings: Record<string, any> = CommonHelpers.lookupKey(tenantSettings, username);
            const userPreferences: Record<string, any> = userSettings[1];

            const newUserSettings: Record<string, any> = {
                ...tenantSettings,
                [ username ]: {
                    ...userPreferences,
                    identityAppsSettings: {
                        ...userPreferences.identityAppsSettings,
                        userPreferences: {
                            ...userPreferences.identityAppsSettings.userPreferences,
                            userListColumns: metaColumns
                        }
                    }
                }
            };

            LocalStorageUtils.setValueInLocalStorage(tenantName, JSON.stringify(newUserSettings));
        }
    };

    /**
     * Handles the `onSearchQueryClear` callback action.
     */
    const handleSearchQueryClear = (): void => {
        setTriggerClearQuery(!triggerClearQuery);
        setSearchQuery("");
        getList(listItemLimit, listOffset, null, null, null);
    };

    /**
     * Dispatches the alert object to the redux store.
     *
     * @param alert - Alert object.
     */
    const handleAlerts = (alert: AlertInterface) => {
        dispatch(addAlert(alert));
    };

    /**
     * The following method set the list of columns selected by the user to
     * the state.
     *
     * @param metaColumns - string[]
     */
    const handleMetaColumnChange = (metaColumns: string[]) => {
        metaColumns.push("profileUrl");
        const tempColumns: Map<string, string> = new Map<string, string> ();

        setUserMetaColumns(metaColumns);

        metaColumns.map((column: string) => {
            tempColumns.set(column, column);
        });
        setUserListMetaContent(tempColumns);
        setListUpdated(true);
    };

    /**
     * Handles the `onFilter` callback action from the
     * users search component.
     *
     * @param query - Search query.
     */
    const handleUserFilter = (query: string): void => {
        const attributes: string = generateAttributesString(userListMetaContent.values());

        if (query === "userName sw ") {
            getList(listItemLimit, listOffset, null, attributes, userStore);

            return;
        }

        setSearchQuery(query);
        setListOffset(0);
        getList(listItemLimit, listOffset, query, attributes, userStore);
    };

    const handlePaginationChange = (event: React.MouseEvent<HTMLAnchorElement>, data: PaginationProps) => {
        setListOffset((data.activePage as number - 1) * listItemLimit);
    };

    const handleItemsPerPageDropdownChange = (event: React.MouseEvent<HTMLAnchorElement>, data: DropdownProps) => {
        setListItemLimit(data.value as number);
    };

    const handleDomainChange = (event: React.MouseEvent<HTMLAnchorElement>, data: DropdownProps) => {
        if (data.value === "all") {
            setUserStore(null);
        } else {
            setUserStore(data.value as string);
        }
    };

    const onUserDelete = (): void => {
        setListUpdated(true);
    };

    /**
     * Handles the click event of the create new user button.
     */
    const handleAddNewUserWizardClick = (): void => {

        getConnectorCategory(ServerConfigurationsConstants.USER_ONBOARDING_CONNECTOR_ID)
            .then((response: GovernanceConnectorCategoryInterface) => {
                const connectors: GovernanceConnectorInterface[]  = response?.connectors;
                const userOnboardingConnector: GovernanceConnectorInterface = connectors.find(
                    (connector: GovernanceConnectorInterface) => connector.id
                        === ServerConfigurationsConstants.USER_EMAIL_VERIFICATION_CONNECTOR_ID
                );

                const emailVerification: ConnectorPropertyInterface = userOnboardingConnector.properties.find(
                    (property: ConnectorPropertyInterface) => 
                        property.name === ServerConfigurationsConstants.EMAIL_VERIFICATION_ENABLED);

                setEmailVerificationEnabled(emailVerification.value === "true");
            }).catch((error: AxiosError) => {
                handleAlerts({
                    description: error?.response?.data?.description ?? t(
                        "console:manage.features.governanceConnectors.notifications." +
                        "getConnector.genericError.description"
                    ),
                    level: AlertLevels.ERROR,
                    message: error?.response?.data?.message ?? t(
                        "console:manage.features.governanceConnectors.notifications." +
                        "getConnector.genericError.message"
                    )
                });
            });
    };
    const ref = useRef(null)
    const handleClick = (e) => {
      ref.current.click()
    }
     
    return (
        <PageLayout
            action={
                (isUserListRequestLoading || !(!searchQuery && usersList?.totalResults <= 0))
                && (
                    <Show when={ AccessControlConstants.USER_WRITE }>
                        <PrimaryButton
                            data-testid="user-mgt-user-list-add-user-button"
                            onClick={ () => handleAddNewUserWizardClick()  }
                        >
                            <Icon name="add"/>
                            { t("console:manage.features.users.buttons.addNewUserBtn") }
                        </PrimaryButton>

                        <PrimaryButton
                            data-testid="user-mgt-user-list-add-user-button"
                            onClick={ () => exportListUser()  }
                        >
                            <Icon name="file excel"/>
                            { t("Export") }
                        </PrimaryButton>
                        {/* <PrimaryButton
                        
                        >
                        <Input
                            type="file" 
                        onInput={(e) => handleFile(e)}
                        />
     </PrimaryButton> */}

<PrimaryButton onClick={handleClick} > <Icon name="add square"/> Import</PrimaryButton>
      <input ref={ref} type="file" style={{ display: 'none' }}  onInput={(e) => handleFile(e)}/>

                       
                    </Show>
                )
            }
            title={ t("console:manage.pages.users.title") }
            pageTitle={ t("console:manage.pages.users.title") }
            description={ t("console:manage.pages.users.subTitle") }
            data-testid={ `${ testId }-page-layout` }
        >
            <ListLayout
                // TODO add sorting functionality.
                advancedSearch={ (
                    <AdvancedSearchWithBasicFilters
                        onFilter={ handleUserFilter }
                        filterAttributeOptions={ [
                            {
                                key: 0,
                                text: t("console:manage.features.users.advancedSearch.form.dropdown." +
                                    "filterAttributeOptions.username"),
                                value: "userName"
                            },
                            {
                                key: 1,
                                text: t("console:manage.features.users.advancedSearch.form.dropdown." +
                                    "filterAttributeOptions.email"),
                                value: "emails"
                            }
                        ] }
                        filterAttributePlaceholder={
                            t("console:manage.features.users.advancedSearch.form.inputs.filterAttribute.placeholder")
                        }
                        filterConditionsPlaceholder={
                            t("console:manage.features.users.advancedSearch.form.inputs.filterCondition" +
                                ".placeholder")
                        }
                        filterValuePlaceholder={
                            t("console:manage.features.users.advancedSearch.form.inputs.filterValue" +
                                ".placeholder")
                        }
                        placeholder={ t("console:manage.features.users.advancedSearch.placeholder") }
                        defaultSearchAttribute="emails"
                        defaultSearchOperator="co"
                        triggerClearQuery={ triggerClearQuery }
                    />
                ) }
                currentListSize={ usersList.itemsPerPage }
                listItemLimit={ listItemLimit }
                onItemsPerPageDropdownChange={ handleItemsPerPageDropdownChange }
                data-testid="user-mgt-user-list-layout"
                onPageChange={ handlePaginationChange }
                rightActionPanel={
                    (
                        <>
                            <Popup
                                className={ "list-options-popup" }
                                flowing
                                basic
                                content={
                                    (<UsersListOptionsComponent
                                        data-testid="user-mgt-user-list-meta-columns"
                                        handleMetaColumnChange={ handleMetaColumnChange }
                                        userListMetaContent={ userListMetaContent }
                                    />)
                                }
                                position="bottom left"
                                on="click"
                                pinned
                                trigger={
                                    (<Button
                                        data-testid="user-mgt-user-list-meta-columns-button"
                                        className="meta-columns-button"
                                        basic
                                    >
                                        <Icon name="columns"/>
                                        { t("console:manage.features.users.buttons.metaColumnBtn") }
                                    </Button>)
                                }
                            />
                            <RootOnlyComponent>
                                <Dropdown
                                    data-testid="user-mgt-user-list-userstore-dropdown"
                                    selection
                                    options={ userStoreOptions && userStoreOptions }
                                    onChange={ handleDomainChange }
                                    defaultValue="all"
                                />
                            </RootOnlyComponent>
                        </>
                    )
                }
                showPagination={ true }
                showTopActionPanel={ isUserListRequestLoading
                    || !(!searchQuery
                        && !userStoreError
                        && userStoreOptions.length < 3
                        && usersList?.totalResults <= 0) }
                totalPages={ Math.ceil(usersList.totalResults / listItemLimit) }
                totalListSize={ usersList.totalResults }
                paginationOptions={ {
                    disableNextButton: !isNextPageAvailable
                } }
                isLoading={ isUserListRequestLoading }
            >
                { userStoreError
                    ? (<EmptyPlaceholder
                        subtitle={ [ t("console:manage.features.users.placeholders.userstoreError.subtitles.0"),
                            t("console:manage.features.users.placeholders.userstoreError.subtitles.1")     ] }
                        title={ t("console:manage.features.users.placeholders.userstoreError.title") }
                        image={ getEmptyPlaceholderIllustrations().genericError }
                        imageSize="tiny"
                    />)
                    : (<UsersList
                        advancedSearch={ (
                            <AdvancedSearchWithBasicFilters
                                onFilter={ handleUserFilter }
                                filterAttributeOptions={ [
                                    {
                                        key: 0,
                                        text: t("console:manage.features.users.advancedSearch.form.dropdown." +
                                            "filterAttributeOptions.username"),
                                        value: "userName"
                                    },
                                    {
                                        key: 1,
                                        text: t("console:manage.features.users.advancedSearch.form.dropdown." +
                                            "filterAttributeOptions.email"),
                                        value: "emails"
                                    }
                                ] }
                                filterAttributePlaceholder={
                                    t("console:manage.features.users.advancedSearch.form.inputs.filterAttribute" +
                                        ".placeholder")
                                }
                                filterConditionsPlaceholder={
                                    t("console:manage.features.users.advancedSearch.form.inputs.filterCondition" +
                                        ".placeholder")
                                }
                                filterValuePlaceholder={
                                    t("console:manage.features.users.advancedSearch.form.inputs.filterValue" +
                                        ".placeholder")
                                }
                                placeholder={ t("console:manage.features.users.advancedSearch.placeholder") }
                                defaultSearchAttribute="emails"
                                defaultSearchOperator="co"
                                triggerClearQuery={ triggerClearQuery }
                            />
                        ) }
                        usersList={ usersList }
                        onUserDelete={ onUserDelete }
                        userMetaListContent={ userListMetaContent }
                        realmConfigs={ realmConfigs }
                        onEmptyListPlaceholderActionClick={ () => setShowWizard(true) }
                        onSearchQueryClear={ handleSearchQueryClear }
                        searchQuery={ searchQuery }
                        data-testid="user-mgt-user-list"
                        readOnlyUserStores={ readOnlyUserStoresList }
                        featureConfig={ featureConfig }
                    />)
                }
                {
                    showWizard && (
                        <AddUserWizard
                            data-testid="user-mgt-add-user-wizard-modal"
                            closeWizard={ () => {
                                setShowWizard(false);
                                setEmailVerificationEnabled(undefined);
                            } }
                            listOffset={ listOffset }
                            listItemLimit={ listItemLimit }
                            updateList={ () => setListUpdated(true) }
                            rolesList={ rolesList }
                            emailVerificationEnabled={ emailVerificationEnabled }
                        />
                    )
                }
            </ListLayout>
        </PageLayout>
    );
};

/**
 * Default props for the component.
 */
UsersPage.defaultProps = {
    "data-testid": "users"
};

/**
 * A default export was added to support React.lazy.
 * TODO: Change this to a named export once react starts supporting named exports for code splitting.
 * @see {@link https://reactjs.org/docs/code-splitting.html#reactlazy}
 */
export default UsersPage;
