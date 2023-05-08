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
import { AlertInterface, AlertLevels, RolesInterface, UserstoreListResponseInterface } from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import {
    EmptyPlaceholder,
    ListLayout,
    PageLayout,
    PrimaryButton
} from "@wso2is/react-components";
import { AxiosError, AxiosResponse } from "axios";
import find from "lodash-es/find";
import React, { FunctionComponent, ReactElement, SyntheticEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch } from "redux";
import { Dropdown, DropdownItemProps, DropdownProps, Icon, PaginationProps,Input } from "semantic-ui-react";
import { createGroup } from "../api";
import {
    AdvancedSearchWithBasicFilters,
    AppState,
    FeatureConfigInterface,
    SharedUserStoreUtils,
    UIConstants,
    UserStoreProperty,
    getAUserStore,
    getEmptyPlaceholderIllustrations
} from "../../core";
import { OrganizationUtils } from "../../organizations/utils";
import { UserStorePostData } from "../../userstores";
import { getUserStoreList } from "../../userstores/api";
import { deleteGroupById, getGroupList, searchGroupList } from "../api";
import { GroupList } from "../components";
import { CreateGroupWizard } from "../components/wizard";
import { GroupDTO, GroupsInterface, SearchGroupInterface } from "../models";
import { getRolesList, updateRole } from "../../roles/api";
import { CreateGroupInterface, CreateGroupMemberInterface } from "../models";
import { Heading, LinkButton, Steps, useWizardAlert } from "@wso2is/react-components";
const GROUPS_SORTING_OPTIONS: DropdownItemProps[] = [
    {
        key: 1,
        text: "Name",
        value: "name"
    },
    {
        key: 3,
        text: "Created date",
        value: "createdDate"
    },
    {
        key: 4,
        text: "Last updated",
        value: "lastUpdated"
    }
];

/**
 * React component to list User Groups.
 *
 * @returns Groups page component.
 */
const GroupsPage: FunctionComponent<any> = (): ReactElement => {
    const dispatch: Dispatch = useDispatch();
    const { t } = useTranslation();

    const featureConfig: FeatureConfigInterface = useSelector((state: AppState) => state.config.ui.features);

    const [ listItemLimit, setListItemLimit ] = useState<number>(UIConstants.DEFAULT_RESOURCE_LIST_ITEM_LIMIT);
    const [ listOffset, setListOffset ] = useState<number>(0);
    const [ showWizard, setShowWizard ] = useState<boolean>(false);
    const [ isListUpdated, setListUpdated ] = useState(false);
    const [ userStoreOptions, setUserStoresList ] = useState<DropdownItemProps[]>([]);
    const [ userStore, setUserStore ] = useState(undefined);
    const [ searchQuery, setSearchQuery ] = useState<string>("");
    // TODO: Check the usage and delete id not required.
    const [ , setIsEmptyResults ] = useState<boolean>(false);
    const [ isGroupsListRequestLoading, setGroupsListRequestLoading ] = useState<boolean>(false);
    const [ triggerClearQuery, setTriggerClearQuery ] = useState<boolean>(false);
    const [ readOnlyUserStoresList, setReadOnlyUserStoresList ] = useState<string[]>(undefined);
    const [ groupsError, setGroupsError ] = useState<boolean>(false);

    const [ groupList, setGroupsList ] = useState<GroupsInterface[]>([]);
    const [ paginatedGroups, setPaginatedGroups ] = useState<GroupsInterface[]>([]);

    const [ listSortingStrategy, setListSortingStrategy ] = useState<DropdownItemProps>(GROUPS_SORTING_OPTIONS[ 0 ]);
    const [ alert, setAlert, alertComponent ] = useWizardAlert();

    useEffect(() => {
        if(searchQuery == "") {
            getGroups();
        }
    },[ groupList.length != 0 ]);

    useEffect(() => {
        getGroups();
        setListUpdated(false);
    }, [ isListUpdated ]);

    useEffect(() => {
        getUserStores();
    }, []);

    useEffect(() => {
        getGroups();
    }, [ userStore ]);

    useEffect(() => {
        if (!OrganizationUtils.isCurrentOrganizationRoot()) {
            return;
        }

        SharedUserStoreUtils.getReadOnlyUserStores().then((response: string[]) => {
            setReadOnlyUserStoresList(response);
        });
    }, [ userStore ]);

    const getGroups = () => {
        setGroupsListRequestLoading(true);

        getGroupList(userStore)
            .then((response: AxiosResponse) => {
                if (response.status === 200) {
                    const groupResources: GroupsInterface[] = response.data.Resources;

                    if (groupResources && groupResources instanceof Array && groupResources.length !== 0) {
                        const updatedResources: GroupsInterface[] = groupResources.filter((role: GroupsInterface) => {
                            return !role.displayName.includes("Application/")
                                && !role.displayName.includes("Internal/");
                        });

                        response.data.Resources = updatedResources;
                        setGroupsList(updatedResources);
                        setGroupsPage(0, listItemLimit, updatedResources);
                    } else {
                        setPaginatedGroups([]);
                        setIsEmptyResults(true);
                    }
                    setGroupsError(false);
                } else {
                    dispatch(addAlert({
                        description: t("console:manage.features.groups.notifications." +
                            "fetchGroups.genericError.description"),
                        level: AlertLevels.ERROR,
                        message: t("console:manage.features.groups.notifications.fetchGroups.genericError.message")
                    }));
                    setGroupsError(true);
                    setGroupsList([]);
                    setPaginatedGroups([]);
                }
            }).catch((error: AxiosError) => {
                dispatch(addAlert({
                    description: error?.response?.data?.description ?? error?.response?.data?.detail
                        ?? t("console:manage.features.groups.notifications.fetchGroups.genericError.description"),
                    level: AlertLevels.ERROR,
                    message: error?.response?.data?.message
                        ?? t("console:manage.features.groups.notifications.fetchGroups.genericError.message")
                }));
                setGroupsError(true);
                setGroupsList([]);
                setPaginatedGroups([]);
            })
            .finally(() => {
                setGroupsListRequestLoading(false);
            });
    };

    const getGroup2 = () => {
        const arrayGroup = [];
        let num : number = 0;
        getGroupList(userStore)
            .then((response: AxiosResponse) => {
                if (response.status === 200) {
                    const groupResources: GroupsInterface[] = response.data.Resources;

                    if (groupResources && groupResources instanceof Array && groupResources.length !== 0) {
                        // const updatedResources: GroupsInterface[] = groupResources.filter((role: GroupsInterface) => {
                        //     return !role.displayName.includes("Application/")
                        //         && !role.displayName.includes("Internal/");
                        // });

                        // response.data.Resources = updatedResources;
                        console.log(groupResources)
                        groupResources.map((group) => {
                        num = num + 1;
                        const displayName:string = "displayName" in group?group.displayName:"";
               
                        const roles:string = "roles" in group?group.roles.reduce((acc, curr) => `${acc}${curr.display},` ,'').slice(0,-1):"";
                       
                        const members:string = "members" in group?group.members.reduce((acc, curr) => `${acc}${curr.display},` ,'').slice(0,-1):"";
                        const created = group.meta.created !== undefined ?moment(group.meta.created).format('DD/MM/YYYY HH:mm:ss'):"";           
                        const lastModified = group.meta.lastModified !== undefined ?moment(group.meta.lastModified).format('DD/MM/YYYY HH:mm:ss'):"";   
                        const groupDTO : GroupDTO = {
                            number:num,
                            id: group.id,
                            displayName: displayName,
                            members: members,
                            roles: roles,
                            created: created,
                            lastModified: lastModified
                        }
                        console.log(groupDTO);
                        arrayGroup.push(groupDTO);
                    });
                    const outputFilename = `list_group_${Date.now()}`;
                    exportToExcel(arrayGroup,outputFilename)
                       
                    } else {
                      
                        setIsEmptyResults(true);
                    }
                   
                } else {
                    dispatch(addAlert({
                        description: t("console:manage.features.groups.notifications." +
                            "fetchGroups.genericError.description"),
                        level: AlertLevels.ERROR,
                        message: t("console:manage.features.groups.notifications.fetchGroups.genericError.message")
                    }));
                
                }
            }).catch((error: AxiosError) => {
                dispatch(addAlert({
                    description: error?.response?.data?.description ?? error?.response?.data?.detail
                        ?? t("console:manage.features.groups.notifications.fetchGroups.genericError.description"),
                    level: AlertLevels.ERROR,
                    message: error?.response?.data?.message
                        ?? t("console:manage.features.groups.notifications.fetchGroups.genericError.message")
                }));
             
            })
            
    };

    const 
    exportToExcel = (csvData, fileName) => {
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
    console.log('reading input file:');
    const file = e.target.files[0];
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    let jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 2,
        defval: "",
    });

    // console.log(e.target.files[0]);
    // console.log(workbook);
    console.log(jsonData);
    jsonData = jsonData?.map((groupDetails: any) => {
        addGroup(groupDetails);
        console.log(groupDetails)
    })
}


const addGroup = (groupDetails: any): void => {
    let groupName = "";

    groupDetails?.domain !== "primary"
        ? groupName = groupDetails?.BasicDetails
            ? groupDetails?.BasicDetails?.domain + "/" + groupDetails?.BasicDetails?.groupName
            : groupDetails?.domain + "/" + groupDetails?.groupName
        : groupName = groupDetails?.BasicDetails ? groupDetails?.BasicDetails?.groupName : groupDetails?.groupName;

    const members: CreateGroupMemberInterface[] = [];
    // const users = groupDetails?.UserList;

    // if (users?.length > 0) {
    //     users?.forEach(user => {
    //         members?.push({
    //             display: user.userName,
    //             value: user.id
    //         });
    //     });
    // }

    const groupData: CreateGroupInterface = {
        "displayName": groupName,
        "members" : members,
        "schemas": [
            "urn:ietf:params:scim:schemas:core:2.0:Group"
        ]

    };

 

    /**
     * Create Group API Call.
     */
    createGroup(groupData).then(response => {
        if (response.status === 201) {

            const createdGroup = response.data;
            const rolesList: string[] = [];

            if (groupDetails?.RoleList?.roles) {
                groupDetails?.RoleList?.roles.forEach(role => {
                    rolesList?.push(role.id);
                });
            }

            const roleData = {
                "Operations": [ {
                    "op": "add",
                    "value": {
                        "groups": [ {
                            "display": createdGroup.displayName,
                            "value": createdGroup.id
                        } ]
                    }
                } ],
                "schemas": [ "urn:ietf:params:scim:api:messages:2.0:PatchOp" ]
            };

            if (rolesList && rolesList.length > 0) {
                for (const roleId of rolesList) {
                    updateRole(roleId, roleData)
                        .catch(error => {
                            if (!error.response || error.response.status === 401) {
                                setAlert({
                                    description: t("console:manage.features.groups.notifications." +
                                        "createPermission." +
                                        "error.description"),
                                    level: AlertLevels.ERROR,
                                    message: t("console:manage.features.groups.notifications.createPermission." +
                                        "error.message")
                                });
                            } else if (error.response && error.response.data.detail) {
                                setAlert({
                                    description: t("console:manage.features.groups.notifications." +
                                        "createPermission." +
                                        "error.description",
                                    { description: error.response.data.detail }),
                                    level: AlertLevels.ERROR,
                                    message: t("console:manage.features.groups.notifications.createPermission." +
                                        "error.message")
                                });
                            } else {
                                setAlert({
                                    description: t("console:manage.features.groups.notifications." +
                                        "createPermission." +
                                        "genericError.description"),
                                    level: AlertLevels.ERROR,
                                    message: t("console:manage.features.groups.notifications.createPermission." +
                                        "genericError." +
                                        "message")
                                });
                            }
                        });
                }
            }

            dispatch(
                addAlert({
                    description: t("console:manage.features.groups.notifications.createGroup.success." +
                        "description"),
                    level: AlertLevels.SUCCESS,
                    message: t("console:manage.features.groups.notifications.createGroup.success." +
                        "message")
                })
            );
        }

     
       
    }).catch(error => {
        if (!error.response || error.response.status === 401) {
          
            dispatch(
                addAlert({
                    description: t("console:manage.features.groups.notifications.createGroup.error.description"),
                    level: AlertLevels.ERROR,
                    message: t("console:manage.features.groups.notifications.createGroup.error.message")
                })
            );
        } else if (error.response && error.response.data.detail) {
           
            dispatch(
                addAlert({
                    description: t("console:manage.features.groups.notifications.createGroup.error.description",
                        { description: error.response.data.detail }),
                    level: AlertLevels.ERROR,
                    message: t("console:manage.features.groups.notifications.createGroup.error.message")
                })
            );
        } else {
         
            dispatch(addAlert({
                description: t("console:manage.features.groups.notifications.createGroup.genericError.description"),
                level: AlertLevels.ERROR,
                message: t("console:manage.features.groups.notifications.createGroup.genericError.message")
            }));
        }
    }).finally(() => {
       console.log("");
    });
};

    /**
     * The following function fetch the user store list and set it to the state.
     */
    const getUserStores = () => {
        const storeOptions: DropdownItemProps[] = [
            {
                key: -2,
                text: "All user stores",
                value: null
            },
            {
                key: -1,
                text: "Primary",
                value: "primary"
            }
        ];

        let storeOption: DropdownItemProps = {
            key: null,
            text: "",
            value: ""
        };

        setUserStore(storeOptions[ 0 ].value);

        if (OrganizationUtils.isCurrentOrganizationRoot()) {
            getUserStoreList()
                .then((response: AxiosResponse<UserstoreListResponseInterface[]>) => {
                    if (storeOptions.length === 0) {
                        storeOptions.push(storeOption);
                    }

                    response.data.map((store: UserstoreListResponseInterface, index: number) => {
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
                    );

                    setUserStoresList(storeOptions);
                });
        }

        setUserStoresList(storeOptions);
    };

    /**
     * Sets the list sorting strategy.
     *
     * @param event - The event.
     * @param data - Dropdown data.
     */
    const handleListSortingStrategyOnChange = (event: SyntheticEvent<HTMLElement>, data: DropdownProps): void => {
        setListSortingStrategy(find(GROUPS_SORTING_OPTIONS, (option: DropdownItemProps) => {
            return data.value === option.value;
        }));
    };

    const searchRoleListHandler = (searchQuery: string) => {
        let searchData: SearchGroupInterface = {
            filter: searchQuery,
            schemas: [
                "urn:ietf:params:scim:api:messages:2.0:SearchRequest"
            ],
            startIndex: 1
        };

        if (userStore) {
            searchData = { ...searchData, domain: userStore };
        }

        setSearchQuery(searchQuery);

        searchGroupList(searchData).then((response: AxiosResponse) => {
            if (response.status === 200) {
                const results: GroupsInterface[] = response.data.Resources;
                let updatedResults: GroupsInterface[] = [];

                if (results) {
                    updatedResults = results.filter((role: RolesInterface) => {
                        return !role.displayName.includes("Application/") && !role.displayName.includes("Internal/");
                    });
                }
                setGroupsList(updatedResults);
                setPaginatedGroups(updatedResults);
            }
        });
    };

    /**
     * Util method to paginate retrieved email template type list.
     *
     * @param offsetValue - pagination offset value.
     * @param itemLimit - pagination item limit.
     * @param list - Role list.
     */
    const setGroupsPage = (offsetValue: number, itemLimit: number, list: GroupsInterface[]) => {
        setPaginatedGroups(list?.slice(offsetValue, itemLimit + offsetValue));
    };

    const handleDomainChange = (event: React.MouseEvent<HTMLAnchorElement>, data: DropdownProps) => {
        setUserStore(data.value as string);
    };

    const handlePaginationChange = (event: React.MouseEvent<HTMLAnchorElement>, data: PaginationProps) => {
        const offsetValue: number = (data.activePage as number - 1) * listItemLimit;

        setListOffset(offsetValue);
        setGroupsPage(offsetValue, listItemLimit, groupList);
    };

    const handleItemsPerPageDropdownChange = (event: React.MouseEvent<HTMLAnchorElement>, data: DropdownProps) => {
        setListItemLimit(data.value as number);
        setGroupsPage(listOffset, data.value as number, groupList);
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
     * Function which will handle role deletion action.
     *
     * @param role - Role which needs to be deleted
     */
    const handleOnDelete = (role: RolesInterface): void => {
        deleteGroupById(role.id).then(() => {
            handleAlerts({
                description: t(
                    "console:manage.features.groups.notifications.deleteGroup.success.description"
                ),
                level: AlertLevels.SUCCESS,
                message: t(
                    "console:manage.features.groups.notifications.deleteGroup.success.message"
                )
            });
            setListUpdated(true);
        }).catch(() => {
            handleAlerts({
                description: t(
                    "console:manage.features.groups.notifications.deleteGroup.genericError.description"
                ),
                level: AlertLevels.ERROR,
                message: t(
                    "console:manage.features.groups.notifications.deleteGroup.error.message"
                )
            });
        });
    };

    /**
     * Handles the `onFilter` callback action from the
     * roles search component.
     *
     * @param query - Search query.
     */
    const handleUserFilter = (query: string): void => {
        if (query === null || query === "displayName sw ") {
            getGroups();

            return;
        }

        searchRoleListHandler(query);
    };

    /**
     * Handles the `onSearchQueryClear` callback action.
     */
    const handleSearchQueryClear = (): void => {
        setTriggerClearQuery(!triggerClearQuery);
        setSearchQuery("");
        getGroups();
    };

    return (
        <PageLayout
            action={
                (isGroupsListRequestLoading || !(!searchQuery && paginatedGroups?.length <= 0))
                && (
                    <Show when={ AccessControlConstants.GROUP_WRITE }>
                        <PrimaryButton
                            data-testid="group-mgt-groups-list-add-button"
                            onClick={ () => setShowWizard(true) }
                        >
                            <Icon name="add"/>
                            { t("console:manage.features.roles.list.buttons.addButton", { type: "Group" }) }
                        </PrimaryButton>

                        <PrimaryButton
                            data-testid="group-mgt-groups-list-add-button"
                            onClick={ () => getGroup2() }
                        >
                            <Icon name="file excel"/>
                            { t("Export") }
                        </PrimaryButton>
                        <Input
                            type="file"
                        onInput={(e) => handleFile(e)}
                        />
                    </Show>
                )
            }
            title={ t("console:manage.pages.groups.title") }
            pageTitle={ t("console:manage.pages.groups.title") }
            description={ t("console:manage.pages.groups.subTitle") }
        >
            <ListLayout
                advancedSearch={ (
                    <AdvancedSearchWithBasicFilters
                        data-testid="group-mgt-groups-list-advanced-search"
                        onFilter={ handleUserFilter  }
                        filterAttributeOptions={ [
                            {
                                key: 0,
                                text: "Name",
                                value: "displayName"
                            }
                        ] }
                        filterAttributePlaceholder={
                            t("console:manage.features.groups.advancedSearch.form.inputs.filterAttribute.placeholder")
                        }
                        filterConditionsPlaceholder={
                            t("console:manage.features.groups.advancedSearch.form.inputs.filterCondition" +
                                ".placeholder")
                        }
                        filterValuePlaceholder={
                            t("console:manage.features.groups.advancedSearch.form.inputs.filterValue" +
                                ".placeholder")
                        }
                        placeholder={ t("console:manage.features.groups.advancedSearch.placeholder") }
                        defaultSearchAttribute="displayName"
                        defaultSearchOperator="sw"
                        triggerClearQuery={ triggerClearQuery }
                    />
                ) }
                currentListSize={ listItemLimit }
                listItemLimit={ listItemLimit }
                onItemsPerPageDropdownChange={ handleItemsPerPageDropdownChange }
                onPageChange={ handlePaginationChange }
                onSortStrategyChange={ handleListSortingStrategyOnChange }
                sortStrategy={ listSortingStrategy }
                rightActionPanel={
                    (<Dropdown
                        data-testid="group-mgt-groups-list-stores-dropdown"
                        selection
                        options={ userStoreOptions && userStoreOptions }
                        placeholder={ t("console:manage.features.groups.list.storeOptions") }
                        value={ userStore && userStore }
                        onChange={ handleDomainChange }
                    />)
                }
                showPagination={ paginatedGroups.length > 0  }
                showTopActionPanel={ isGroupsListRequestLoading
                    || !(!searchQuery
                        && !groupsError
                        && userStoreOptions.length < 3
                        && paginatedGroups?.length <= 0) }
                totalPages={ Math.ceil(groupList?.length / listItemLimit) }
                totalListSize={ groupList?.length }
                isLoading={ isGroupsListRequestLoading }
            >
                { groupsError
                    ? (<EmptyPlaceholder
                        subtitle={ [ t("console:manage.features.groups.placeholders.groupsError.subtitles.0"),
                            t("console:manage.features.groups.placeholders.groupsError.subtitles.1") ] }
                        title={ t("console:manage.features.groups.placeholders.groupsError.title") }
                        image={ getEmptyPlaceholderIllustrations().genericError }
                        imageSize="tiny"
                    />) :
                    (<GroupList
                        advancedSearch={ (
                            <AdvancedSearchWithBasicFilters
                                data-testid="group-mgt-groups-list-advanced-search"
                                onFilter={ handleUserFilter }
                                filterAttributeOptions={ [
                                    {
                                        key: 0,
                                        text: "Name",
                                        value: "displayName"
                                    }
                                ] }
                                filterAttributePlaceholder={
                                    t("console:manage.features.groups.advancedSearch.form.inputs.filterAttribute" +
                                        ".placeholder")
                                }
                                filterConditionsPlaceholder={
                                    t("console:manage.features.groups.advancedSearch.form.inputs.filterCondition" +
                                        ".placeholder")
                                }
                                filterValuePlaceholder={
                                    t("console:manage.features.groups.advancedSearch.form.inputs.filterValue" +
                                        ".placeholder")
                                }
                                placeholder={ t("console:manage.features.groups.advancedSearch.placeholder") }
                                defaultSearchAttribute="displayName"
                                defaultSearchOperator="sw"
                                triggerClearQuery={ triggerClearQuery }
                            />
                        ) }
                        data-testid="group-mgt-groups-list"
                        handleGroupDelete={ handleOnDelete }
                        onEmptyListPlaceholderActionClick={ () => setShowWizard(true) }
                        onSearchQueryClear={ handleSearchQueryClear }
                        groupList={ paginatedGroups }
                        searchQuery={ searchQuery }
                        readOnlyUserStores={ readOnlyUserStoresList }
                        featureConfig={ featureConfig }
                    />)
                }
            </ListLayout>
            {
                showWizard && (
                    <CreateGroupWizard
                        data-testid="group-mgt-create-group-wizard"
                        closeWizard={ () => setShowWizard(false) }
                        updateList={ () => setListUpdated(true) }
                    />
                )
            }
        </PageLayout>
    );
};

/**
 * A default export was added to support React.lazy.
 * TODO: Change this to a named export once react starts supporting named exports for code splitting.
 * @see {@link https://reactjs.org/docs/code-splitting.html#reactlazy}
 */
export default GroupsPage;
