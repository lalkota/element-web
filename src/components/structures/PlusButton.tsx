/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useContext, type JSX } from "react";
import { EventType, type Room, RoomType } from "matrix-js-sdk/src/matrix";

import MatrixClientContext from "../../contexts/MatrixClientContext";
import { shouldShowComponent } from "../../customisations/helpers/UIComponents";
import { _t } from "../../languageHandler";
import { UIComponent } from "../../settings/UIFeature";
import { Action } from "../../dispatcher/actions";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { type ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import { useFeatureEnabled } from "../../hooks/useSettings";
import PosthogTrackers from "../../PosthogTrackers";
import {
    shouldShowSpaceInvite,
    showAddExistingRooms,
    showCreateNewRoom,
    showCreateNewSubspace,
    showSpaceInvite,
} from "../../utils/space";
import { BetaPill } from "../views/beta/BetaCard";
import { useContextMenu } from "./ContextMenu";
import IconizedContextMenu, {
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
} from "../views/context_menus/IconizedContextMenu";

interface IProps {
    activeSpace: Room | null;
}

const PlusButton: React.FC<IProps> = ({ activeSpace }) => {
    const cli = useContext(MatrixClientContext);
    const [plusMenuDisplayed, plusMenuHandle, openPlusMenu, closePlusMenu] = useContextMenu<HTMLDivElement>();

    const canExploreRooms = shouldShowComponent(UIComponent.ExploreRooms);
    const canCreateRooms = shouldShowComponent(UIComponent.CreateRooms);
    const canCreateSpaces = shouldShowComponent(UIComponent.CreateSpaces);
    const videoRoomsEnabled = useFeatureEnabled("feature_video_rooms");
    const elementCallVideoRoomsEnabled = useFeatureEnabled("feature_element_call_video_rooms");

    const hasPermissionToAddSpaceChild = activeSpace?.currentState?.maySendStateEvent(
        EventType.SpaceChild,
        cli.getUserId()!,
    );
    const canAddSubRooms = hasPermissionToAddSpaceChild && canCreateRooms;
    const canAddSubSpaces = hasPermissionToAddSpaceChild && canCreateSpaces;

    // If the user can't do anything on the plus menu, don't show it
    const canShowPlusMenu = canCreateRooms || canExploreRooms || canCreateSpaces || activeSpace;

    if (!canShowPlusMenu) {
        return null;
    }

    const contextMenuBelow = (elementRect: DOMRect) => ({
        left: elementRect.left,
        top: elementRect.bottom,
        chevronFace: "none" as const,
    });

    let contextMenu: JSX.Element | undefined;
    if (plusMenuDisplayed && activeSpace) {
        let inviteOption: JSX.Element | undefined;
        if (shouldShowSpaceInvite(activeSpace)) {
            inviteOption = (
                <IconizedContextMenuOption
                    label={_t("action|invite")}
                    iconClassName="mx_LegacyRoomListHeader_iconInvite"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        showSpaceInvite(activeSpace);
                        closePlusMenu();
                    }}
                />
            );
        }

        let newRoomOptions: JSX.Element | undefined;
        if (activeSpace?.currentState.maySendStateEvent(EventType.RoomAvatar, cli.getUserId()!)) {
            newRoomOptions = (
                <>
                    <IconizedContextMenuOption
                        iconClassName="mx_LegacyRoomListHeader_iconNewRoom"
                        label={_t("action|new_room")}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            showCreateNewRoom(activeSpace);
                            PosthogTrackers.trackInteraction("WebRoomListHeaderPlusMenuCreateRoomItem", e);
                            closePlusMenu();
                        }}
                    />
                    {videoRoomsEnabled && (
                        <IconizedContextMenuOption
                            iconClassName="mx_LegacyRoomListHeader_iconNewVideoRoom"
                            label={_t("action|new_video_room")}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                showCreateNewRoom(
                                    activeSpace,
                                    elementCallVideoRoomsEnabled ? RoomType.UnstableCall : RoomType.ElementVideo,
                                );
                                closePlusMenu();
                            }}
                        >
                            <BetaPill />
                        </IconizedContextMenuOption>
                    )}
                </>
            );
        }

        contextMenu = (
            <IconizedContextMenu
                {...contextMenuBelow(plusMenuHandle.current!.getBoundingClientRect())}
                onFinished={closePlusMenu}
                compact
            >
                <IconizedContextMenuOptionList first>
                    {inviteOption}
                    {newRoomOptions}
                    <IconizedContextMenuOption
                        label={_t("action|explore_rooms")}
                        iconClassName="mx_LegacyRoomListHeader_iconExplore"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            defaultDispatcher.dispatch<ViewRoomPayload>({
                                action: Action.ViewRoom,
                                room_id: activeSpace.roomId,
                                metricsTrigger: undefined, // other
                            });
                            closePlusMenu();
                            PosthogTrackers.trackInteraction("WebRoomListHeaderPlusMenuExploreRoomsItem", e);
                        }}
                    />
                    <IconizedContextMenuOption
                        label={_t("action|add_existing_room")}
                        iconClassName="mx_LegacyRoomListHeader_iconPlus"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            showAddExistingRooms(activeSpace);
                            closePlusMenu();
                        }}
                        disabled={!canAddSubRooms}
                        title={!canAddSubRooms ? _t("spaces|error_no_permission_add_room") : undefined}
                    />
                    {canCreateSpaces && (
                        <IconizedContextMenuOption
                            label={_t("room_list|add_space_label")}
                            iconClassName="mx_LegacyRoomListHeader_iconPlus"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                showCreateNewSubspace(activeSpace);
                                closePlusMenu();
                            }}
                            disabled={!canAddSubSpaces}
                            title={!canAddSubSpaces ? _t("spaces|error_no_permission_add_space") : undefined}
                        >
                            <BetaPill />
                        </IconizedContextMenuOption>
                    )}
                </IconizedContextMenuOptionList>
            </IconizedContextMenu>
        );
    } else if (plusMenuDisplayed && !activeSpace) {
        // Home space menu
        let newRoomOpts: JSX.Element | undefined;
        let joinRoomOpt: JSX.Element | undefined;

        if (canCreateRooms) {
            newRoomOpts = (
                <>
                    <IconizedContextMenuOption
                        label={_t("action|start_new_chat")}
                        iconClassName="mx_LegacyRoomListHeader_iconStartChat"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            defaultDispatcher.dispatch({ action: Action.CreateChat });
                            PosthogTrackers.trackInteraction("WebRoomListHeaderPlusMenuCreateChatItem", e);
                            closePlusMenu();
                        }}
                    />
                    <IconizedContextMenuOption
                        label={_t("action|new_room")}
                        iconClassName="mx_LegacyRoomListHeader_iconNewRoom"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            defaultDispatcher.dispatch({ action: Action.CreateRoom });
                            PosthogTrackers.trackInteraction("WebRoomListHeaderPlusMenuCreateRoomItem", e);
                            closePlusMenu();
                        }}
                    />
                    {videoRoomsEnabled && (
                        <IconizedContextMenuOption
                            label={_t("action|new_video_room")}
                            iconClassName="mx_LegacyRoomListHeader_iconNewVideoRoom"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                defaultDispatcher.dispatch({
                                    action: Action.CreateRoom,
                                    type: elementCallVideoRoomsEnabled ? RoomType.UnstableCall : RoomType.ElementVideo,
                                });
                                closePlusMenu();
                            }}
                        >
                            <BetaPill />
                        </IconizedContextMenuOption>
                    )}
                </>
            );
        }
        if (canExploreRooms) {
            joinRoomOpt = (
                <IconizedContextMenuOption
                    label={_t("room_list|join_public_room_label")}
                    iconClassName="mx_LegacyRoomListHeader_iconExplore"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        defaultDispatcher.dispatch({ action: Action.ViewRoomDirectory });
                        PosthogTrackers.trackInteraction("WebRoomListHeaderPlusMenuExploreRoomsItem", e);
                        closePlusMenu();
                    }}
                />
            );
        }

        contextMenu = (
            <IconizedContextMenu
                {...contextMenuBelow(plusMenuHandle.current!.getBoundingClientRect())}
                onFinished={closePlusMenu}
                compact
            >
                <IconizedContextMenuOptionList first>
                    {newRoomOpts}
                    {joinRoomOpt}
                </IconizedContextMenuOptionList>
            </IconizedContextMenu>
        );
    }

    return (
        <>
            <button
                ref={plusMenuHandle}
                onClick={openPlusMenu}
                className="mx_PlusButton mx_PlusButton_primary"
                aria-expanded={plusMenuDisplayed}
                title={_t("action|add")}
            >
                <div className="mx_PlusButton_icon" />
                <span className="mx_PlusButton_text">New chat</span>
            </button>
            {contextMenu}
        </>
    );
};

export default PlusButton;
