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
import { HttpMethods  } from "@wso2is/core/models";
import { AccessControlConstants, Show } from "@wso2is/access-control";
import { 
    AlertInterface,
    AlertLevels,
    RoleListInterface,
    RolesInterface,
    UserstoreListResponseInterface
} from "@wso2is/core/models";
import { addAlert } from "@wso2is/core/store";
import { ListLayout, PageLayout, PrimaryButton } from "@wso2is/react-components";
import { AxiosResponse } from "axios";
import find from "lodash-es/find";
import React, { ReactElement, SyntheticEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Dispatch } from "redux";
import { Dropdown, DropdownItemProps, DropdownProps, Icon, PaginationProps,Input } from "semantic-ui-react";
import { AdvancedSearchWithBasicFilters, AppConstants, UIConstants } from "../../core";
import { CreateRoleWizard, RoleList } from "../../roles";
import { createRole, getRolesList } from "../../roles/api";
import { getUserStoreList } from "../../userstores/api";
import { deleteRoleById, searchRoleList } from "../api";
import { APPLICATION_DOMAIN, INTERNAL_DOMAIN } from "../constants";
import { SearchRoleInterface,RoleDTO, CreateRoleInterface, CreateRoleMemberInterface, TreeNode } from "../models";
import { getRoleById } from "../api";
import { CreateGroupMemberInterface } from '../../groups';

const ROLES_SORTING_OPTIONS: DropdownItemProps[] = [
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

const filterOptions: DropdownItemProps[] = [
    {
        key: "all",
        text: "Show All",
        value: "all"
    },
    {
        key: APPLICATION_DOMAIN,
        text: "Application Domain",
        value: APPLICATION_DOMAIN
    },
    {
        key: INTERNAL_DOMAIN,
        text: "Internal Domain",
        value: INTERNAL_DOMAIN
    }
];

/**
 * React component to list User Roles.
 *
 * @returns Roles page component.
 */
const RolesPage = (): ReactElement => {
    const dispatch: Dispatch = useDispatch();
    const { t } = useTranslation();

    const [ listItemLimit, setListItemLimit ] = useState<number>(UIConstants.DEFAULT_RESOURCE_LIST_ITEM_LIMIT);
    const [ listOffset, setListOffset ] = useState<number>(0);
    const [ showWizard, setShowWizard ] = useState<boolean>(false);
    const [ , setListUpdated ] = useState(false);
    // TODO: Check the usage and delete if not required.
    const [ , setUserStoresList ] = useState([]);
    const [ userStore ] = useState(undefined);
    const [ filterBy, setFilterBy ] = useState<string>("all");
    const [ searchQuery, setSearchQuery ] = useState<string>("");
    const [ isEmptyResults ] = useState<boolean>(false);
    const [ isRoleListFetchRequestLoading, setRoleListFetchRequestLoading ] = useState<boolean>(false);
    const [ triggerClearQuery, setTriggerClearQuery ] = useState<boolean>(false);

    const [ initialRolList, setInitialRoleList ] = useState<RoleListInterface>();
    const [ paginatedRoles, setPaginatedRoles ] = useState<RoleListInterface>();

    const [ listSortingStrategy, setListSortingStrategy ] = useState<DropdownItemProps>(ROLES_SORTING_OPTIONS[ 0 ]);

    useEffect(() => {
        getUserStores();
    }, []);

    useEffect(() => {
        getRoles();
    }, [ filterBy, userStore ]);

    const getRoles = () => {
        setRoleListFetchRequestLoading(true);

        getRolesList(userStore)
            .then((response: AxiosResponse<RoleListInterface>) => {
                if (response.status === 200) {
                    const roleResources: RolesInterface[] = response.data.Resources;

                    if (roleResources && roleResources instanceof Array) {
                        const updatedResources: RolesInterface[] = roleResources.filter((role: RolesInterface) => {
                            if (filterBy === "all") {
                                return role.displayName;
                            } else if (APPLICATION_DOMAIN === filterBy) {
                                return role.displayName.includes(APPLICATION_DOMAIN);
                            } else if (INTERNAL_DOMAIN === filterBy) {
                                return !role.displayName.includes(APPLICATION_DOMAIN);
                            }
                        });

                        response.data.Resources = updatedResources;
                        setInitialRoleList(response.data);
                        setRolesPage(0, listItemLimit, response.data);
                    }
                }
            })
            .finally(() => {
                setRoleListFetchRequestLoading(false);
            });
    };

    const exportListRole = () => {
        setRoleListFetchRequestLoading(true);
      
        getRolesList(userStore)
            .then((response: AxiosResponse<RoleListInterface>) => {
                if (response.status === 200) {
                    let num : number = 0;
                    const roleResources: RolesInterface[] = response.data.Resources;
                    const tasks = [];
                    if (roleResources && roleResources instanceof Array) {
                            roleResources.map((role) => {
                                num = num +1; 
                                tasks.push(getRoleDTOById(role,num));
                        });
                        Promise.all(tasks).then(result => {
                            const outputFilename = `list_role_${Date.now()}`;
                            exportToExcel(result,outputFilename);
                          });
                    }
                }
            })
            .finally(() => {
                setRoleListFetchRequestLoading(false);
            });
    };
    const 
    getRoleDTOById = (role,num) => {
        const roleDTO = getRoleById(role.id)
        .then(response => {
                const id:string = "id" in response.data? response.data.id :"";
                const displayName:string = "displayName" in response.data? response.data.displayName :"";
                const group:string = "groups" in response.data?response.data.groups.reduce((acc, curr) => `${acc}${curr.display},` ,'').slice(0,-1):"";  
                const user:string = "users" in response.data?response.data.users.reduce((acc, curr) => `${acc}${curr.display},` ,'').slice(0,-1):"";  
                const roleDTO: RoleDTO = {
                    number: num,
                    id: id,
                    displayName: displayName,
                    group: group,
                    user: user
                  };
                 return roleDTO;
        }).catch(() => {
            // TODO: handle error
        })
        .finally(() => {
            console.log();
        });
        return roleDTO;
}
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
    const file = e.target.files[0];
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 2,
        defval: "",
    });


    
    jsonData?.map((role) => {
        // addUserBasic(user);
        addRole(role)
    })
}

const addRole = (basicData: any): void => {

    const users: CreateRoleMemberInterface[] = [];
    const groups: CreateGroupMemberInterface[] = [];
    const permissions: string[] = [];


    const roleData: CreateRoleInterface = {
        "displayName": basicData.roleName?basicData.roleName:"",
        "groups": groups,
        "permissions": permissions,
        "schemas": [
            "urn:ietf:params:scim:schemas:extension:2.0:Role"
        ],
        "users": users
    };

        // Create Role API Call.
        createRole(roleData).then(response => {
            if (response.status === 201) {
                dispatch(
                    addAlert({
                        description: t("console:manage.features.roles.notifications.createRole." +
                            "success.description"),
                        level: AlertLevels.SUCCESS,
                        message: t("console:manage.features.roles.notifications.createRole.success.message")
                    })
                );
            }

        }).catch(error => {
            if (!error.response || error.response.status === 401) {
          
                dispatch(
                    addAlert({
                        description: t("console:manage.features.roles.notifications.createRole.error.description"),
                        level: AlertLevels.ERROR,
                        message: t("console:manage.features.roles.notifications.createRole.error.message")
                    })
                );
            } else if (error.response && error.response.data.detail) {
          
                dispatch(
                    addAlert({
                        description: t("console:manage.features.roles.notifications.createRole.error.description",
                            { description: error.response.data.detail }),
                        level: AlertLevels.ERROR,
                        message: t("console:manage.features.roles.notifications.createRole.error.message")
                    })
                );
            } else {
            
                dispatch(addAlert({
                    description: t("console:manage.features.roles.notifications.createRole." +
                        "genericError.description"),
                    level: AlertLevels.ERROR,
                    message: t("console:manage.features.roles.notifications.createRole.genericError.message")
                }));
            }
        }).finally(() => {
            console.log()
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

        getUserStoreList()
            .then((response: AxiosResponse<UserstoreListResponseInterface[]>) => {
                if (storeOptions.length === 0) {
                    storeOptions.push(storeOption);
                }
                response.data.map((store: UserstoreListResponseInterface, index: number) => {
                    storeOption = {
                        key: index,
                        text: store.name,
                        value: store.name
                    };
                    storeOptions.push(storeOption);
                }
                );
                setUserStoresList(storeOptions);
            });

        setUserStoresList(storeOptions);
    };

    /**
     * Sets the list sorting strategy.
     *
     * @param event - The event.
     * @param data - Dropdown data.
     */
    const handleListSortingStrategyOnChange = (event: SyntheticEvent<HTMLElement>, data: DropdownProps): void => {
        setListSortingStrategy(find(ROLES_SORTING_OPTIONS, (option: DropdownItemProps) => {
            return data.value === option.value;
        }));
    };

    const searchRoleListHandler = (searchQuery: string) => {
        const searchData: SearchRoleInterface = {
            filter: searchQuery,
            schemas: [ "urn:ietf:params:scim:api:messages:2.0:SearchRequest" ],
            startIndex: 1
        };

        setSearchQuery(searchQuery);

        searchRoleList(searchData)
            .then((response: AxiosResponse<RoleListInterface>) => {

                if (response.status === 200) {
                    const results: RolesInterface[] = response?.data?.Resources;

                    let updatedResults: RolesInterface[] = [];

                    if (results) {
                        updatedResults = results;
                    }

                    const updatedData: RoleListInterface = {
                        ...response.data,
                        Resources: updatedResults
                    };

                    setInitialRoleList(updatedData);
                    setPaginatedRoles(updatedData);
                }
            });
    };

    /**
     * Util method to paginate retrieved role list.
     *
     * @param offsetValue - pagination offset value.
     * @param itemLimit - pagination item limit.
     */
    const setRolesPage = (offsetValue: number, itemLimit: number, roleList: RoleListInterface) => {
        const updatedData: RoleListInterface = {
            ...roleList,
            ...roleList.Resources,
            Resources: roleList?.Resources?.slice(offsetValue, itemLimit + offsetValue)
        };

        setPaginatedRoles(updatedData);
    };

    const handlePaginationChange = (event: React.MouseEvent<HTMLAnchorElement>, data: PaginationProps) => {
        const offsetValue: number = (data.activePage as number - 1) * listItemLimit;

        setListOffset(offsetValue);
        setRolesPage(offsetValue, listItemLimit, initialRolList);
    };

    const handleItemsPerPageDropdownChange = (event: React.MouseEvent<HTMLAnchorElement>, data: DropdownProps) => {
        setListItemLimit(data.value as number);
        setRolesPage(listOffset, data.value as number, initialRolList);
    };

    const handleFilterChange = (event: React.MouseEvent<HTMLAnchorElement>, data: DropdownProps) => {
        setFilterBy(data.value as string);
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
     * @param role - Role ID which needs to be deleted
     */
    const handleOnDelete = (role: RolesInterface): void => {
        deleteRoleById(role.id).then(() => {
            handleAlerts({
                description: t(
                    "console:manage.features.roles.notifications.deleteRole.success.description"
                ),
                level: AlertLevels.SUCCESS,
                message: t(
                    "console:manage.features.roles.notifications.deleteRole.success.message"
                )
            });
            getRoles();
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
            getRoles();

            return;
        }

        searchRoleListHandler(query);
    };

    /**
     * Handles the `onSearchQueryClear` callback action.
     */
    const handleSearchQueryClear = (): void => {
        setTriggerClearQuery(!triggerClearQuery);
        setSearchQuery(null);
        getRoles();
    };
    const ref = useRef(null)
    const handleClick = (e) => {
      ref.current.click()
    }

    return (
        <PageLayout
            action={
                (isRoleListFetchRequestLoading || !(!searchQuery && paginatedRoles?.Resources?.length <= 0))
                && (
                    <Show when={ AccessControlConstants.ROLE_WRITE }>
                        <PrimaryButton
                            data-testid="role-mgt-roles-list-add-button"
                            onClick={ () => setShowWizard(true) }
                        >
                            <Icon
                                data-testid="role-mgt-roles-list-add-button-icon"
                                name="add"
                            />
                            { t("console:manage.features.roles.list.buttons.addButton", { type: "Role" }) }
                        </PrimaryButton>
                        <PrimaryButton
                            data-testid="user-mgt-user-list-add-user-button"
                            onClick={ () => exportListRole()  }
                        >
                            <Icon name="file excel"/>
                            { t("Export") }
                        </PrimaryButton>
                        {/* <Input
                            type="file"
                        onInput={(e) => handleFile(e)}
                        /> */}
                        <PrimaryButton onClick={handleClick} > <Icon name="add square"/> Import</PrimaryButton>
      <input ref={ref} type="file" style={{ display: 'none' }}  onInput={(e) => handleFile(e)}/>
                    </Show>
                )
            }
            title={ t("console:manage.pages.roles.title") }
            pageTitle={ t("console:manage.pages.roles.title") }
            description={ t("console:manage.pages.roles.subTitle") }
        >
            {
                !isEmptyResults && (
                    <ListLayout
                        advancedSearch={ (
                            <AdvancedSearchWithBasicFilters
                                data-testid="role-mgt-roles-list-advanced-search"
                                onFilter={ handleUserFilter  }
                                filterAttributeOptions={ [
                                    {
                                        key: 0,
                                        text: "Name",
                                        value: "displayName"
                                    }
                                ] }
                                filterAttributePlaceholder={
                                    t("console:manage.features.roles.advancedSearch.form.inputs.filterAttribute." +
                                    "placeholder")
                                }
                                filterConditionsPlaceholder={
                                    t("console:manage.features.roles.advancedSearch.form.inputs.filterCondition" +
                                    ".placeholder")
                                }
                                filterValuePlaceholder={
                                    t("console:manage.features.roles.advancedSearch.form.inputs.filterValue" +
                                    ".placeholder")
                                }
                                placeholder={ t("console:manage.features.roles.advancedSearch.placeholder") }
                                defaultSearchAttribute="displayName"
                                defaultSearchOperator="co"
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
                            (
                                <Dropdown
                                    data-testid="role-mgt-roles-list-filters-dropdown"
                                    selection
                                    options={ filterOptions }
                                    placeholder= { t("console:manage.features.roles.list.buttons.filterDropdown") }
                                    onChange={ handleFilterChange }
                                />
                            )
                        }
                        showPagination={ paginatedRoles?.Resources?.length > 0 }
                        showTopActionPanel={
                            isRoleListFetchRequestLoading || !(!searchQuery && paginatedRoles?.Resources?.length <= 0)
                        }
                        totalPages={ Math.ceil(initialRolList?.Resources?.length / listItemLimit) }
                        totalListSize={ initialRolList?.Resources?.length }
                        isLoading={ isRoleListFetchRequestLoading }
                    >
                        <RoleList
                            advancedSearch={ (
                                <AdvancedSearchWithBasicFilters
                                    data-testid="role-mgt-roles-list-advanced-search"
                                    onFilter={ handleUserFilter  }
                                    filterAttributeOptions={ [
                                        {
                                            key: 0,
                                            text: "Name",
                                            value: "displayName"
                                        }
                                    ] }
                                    filterAttributePlaceholder={
                                        t("console:manage.features.roles.advancedSearch.form.inputs.filterAttribute." +
                                        "placeholder")
                                    }
                                    filterConditionsPlaceholder={
                                        t("console:manage.features.roles.advancedSearch.form.inputs.filterCondition" +
                                        ".placeholder")
                                    }
                                    filterValuePlaceholder={
                                        t("console:manage.features.roles.advancedSearch.form.inputs.filterValue" +
                                        ".placeholder")
                                    }
                                    placeholder={ t("console:manage.features.roles.advancedSearch.placeholder") }
                                    defaultSearchAttribute="displayName"
                                    defaultSearchOperator="sw"
                                    triggerClearQuery={ triggerClearQuery }
                                />
                            ) }
                            data-testid="role-mgt-roles-list"
                            handleRoleDelete={ handleOnDelete }
                            isGroup={ false }
                            onEmptyListPlaceholderActionClick={ () => setShowWizard(true) }
                            onSearchQueryClear={ handleSearchQueryClear }
                            roleList={ paginatedRoles }
                            searchQuery={ searchQuery }
                        />
                    </ListLayout>
                )
            }
            {
                showWizard && (
                    <CreateRoleWizard
                        data-testid="role-mgt-create-role-wizard"
                        isAddGroup={ false }
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
export default RolesPage;
