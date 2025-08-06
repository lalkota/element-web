/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useCallback, useMemo, useState, useEffect } from "react";
import { Body as BodyText, Button, IconButton, Menu, MenuItem, Tooltip } from "@vector-im/compound-web";
import VideoCallIcon from "@vector-im/compound-design-tokens/assets/web/icons/video-call-solid";
import CallIcon from "../../../../../res/img/element-icons/room/composer/call.svg";
import VideoIcon from "../../../../../res/img/element-icons/room/composer/video.svg";
import ChatIcon from "./icons/ChatIcon";
import ImageIcon from "./icons/ImageIcon";
import AttachmentIcon from "./icons/AttachmentIcon";
import ExternalLinkIcon from "@vector-im/compound-design-tokens/assets/web/icons/link";

import CloseCallIcon from "@vector-im/compound-design-tokens/assets/web/icons/close";
import ThreadsIcon from "@vector-im/compound-design-tokens/assets/web/icons/threads-solid";
import RoomInfoIcon from "@vector-im/compound-design-tokens/assets/web/icons/info-solid";
import NotificationsIcon from "@vector-im/compound-design-tokens/assets/web/icons/notifications-solid";
import VerifiedIcon from "@vector-im/compound-design-tokens/assets/web/icons/verified";
import ErrorIcon from "@vector-im/compound-design-tokens/assets/web/icons/error-solid";
import PublicIcon from "@vector-im/compound-design-tokens/assets/web/icons/public";
import { JoinRule, type Room } from "matrix-js-sdk/src/matrix";
import { type ViewRoomOpts } from "@matrix-org/react-sdk-module-api/lib/lifecycles/RoomViewLifecycle";

import { useRoomName } from "../../../../hooks/useRoomName.ts";
import { RightPanelPhases } from "../../../../stores/right-panel/RightPanelStorePhases.ts";
import DMRoomMap from "../../../../utils/DMRoomMap.ts";
import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext.tsx";
import { useRoomMemberCount, useRoomMembers } from "../../../../hooks/useRoomMembers.ts";
import { _t } from "../../../../languageHandler.tsx";
import { Flex } from "../../../utils/Flex.tsx";
import { Box } from "../../../utils/Box.tsx";
import { getPlatformCallTypeProps, useRoomCall } from "../../../../hooks/room/useRoomCall.tsx";
import { useRoomThreadNotifications } from "../../../../hooks/room/useRoomThreadNotifications.ts";
import { useGlobalNotificationState } from "../../../../hooks/useGlobalNotificationState.ts";
import SdkConfig from "../../../../SdkConfig.ts";
import { useFeatureEnabled } from "../../../../hooks/useSettings.ts";
import { useEncryptionStatus } from "../../../../hooks/useEncryptionStatus.ts";
import { E2EStatus } from "../../../../utils/ShieldUtils.ts";
import FacePile from "../../elements/FacePile.tsx";
import { useRoomState } from "../../../../hooks/useRoomState.ts";
import RoomAvatar from "../../avatars/RoomAvatar.tsx";
import { formatCount } from "../../../../utils/FormattingUtils.ts";
import RightPanelStore from "../../../../stores/right-panel/RightPanelStore.ts";
import PosthogTrackers from "../../../../PosthogTrackers.ts";
import { VideoRoomChatButton } from "./VideoRoomChatButton.tsx";
import { RoomKnocksBar } from "../RoomKnocksBar.tsx";
import { isVideoRoom as calcIsVideoRoom } from "../../../../utils/video-rooms.ts";
import { notificationLevelToIndicator } from "../../../../utils/notifications.ts";
import { CallGuestLinkButton } from "./CallGuestLinkButton.tsx";
import RoomImagesView from "../RoomImagesView";
import RoomFilesView from "../RoomFilesView";
import AccessibleButton from "../../elements/AccessibleButton";
import classNames from "classnames";
import { type ButtonEvent } from "../../elements/AccessibleButton.tsx";
import WithPresenceIndicator, { useDmMember } from "../../avatars/WithPresenceIndicator.tsx";
import { type IOOBData } from "../../../../stores/ThreepidInviteStore.ts";
import { MainSplitContentType } from "../../../structures/RoomView.tsx";
import defaultDispatcher from "../../../../dispatcher/dispatcher.ts";
import { RoomSettingsTab } from "../../dialogs/RoomSettingsDialog.tsx";
import { useScopedRoomContext } from "../../../../contexts/ScopedRoomContext.tsx";
import { ToggleableIcon } from "./toggle/ToggleableIcon.tsx";
import { CurrentRightPanelPhaseContextProvider } from "../../../../contexts/CurrentRightPanelPhaseContext.tsx";
import { useRoomTab, RoomContentTab } from "../../../../contexts/RoomTabContext";
import GroupIcon from "@vector-im/compound-design-tokens/assets/web/icons/group";

export default function RoomHeader({
    room,
    additionalButtons,
    oobData,
}: {
    room: Room;
    additionalButtons?: ViewRoomOpts["buttons"];
    oobData?: IOOBData;
}): JSX.Element {
    const client = useMatrixClientContext();
    const { activeTab, setActiveTab } = useRoomTab();

    const roomName = useRoomName(room);
    const joinRule = useRoomState(room, (state) => state.getJoinRule());
    
    // Check if this is a direct message room
    const isDM = useMemo(() => {
        const dmRoomMap = DMRoomMap.shared();
        return dmRoomMap.getUserIdForRoomId(room.roomId) !== undefined;
    }, [room.roomId]);
    
    // Switch to Chat tab if current tab becomes unavailable due to room type
    useEffect(() => {
        // If we're in a DM and on Links tab, switch to Chat
        if (isDM && activeTab === RoomContentTab.Links) {
            setActiveTab(RoomContentTab.Chat);
        }
        // If we're in a room (not DM) and on Images tab, switch to Chat
        if (!isDM && activeTab === RoomContentTab.Images) {
            setActiveTab(RoomContentTab.Chat);
        }
    }, [isDM, activeTab, setActiveTab]);

    const members = useRoomMembers(room, 2500);
    const memberCount = useRoomMemberCount(room, { throttleWait: 2500 });

    const {
        voiceCallDisabledReason,
        voiceCallClick,
        videoCallDisabledReason,
        videoCallClick,
        toggleCallMaximized: toggleCall,
        isViewingCall,
        isConnectedToCall,
        hasActiveCallSession,
        callOptions,
        showVoiceCallButton,
        showVideoCallButton,
    } = useRoomCall(room);

    const groupCallsEnabled = useFeatureEnabled("feature_group_calls");
    /**
     * A special mode where only Element Call is used. In this case we want to
     * hide the voice call button
     */
    const useElementCallExclusively = useMemo(() => {
        return SdkConfig.get("element_call").use_exclusively && groupCallsEnabled;
    }, [groupCallsEnabled]);

    const threadNotifications = useRoomThreadNotifications(room);
    const globalNotificationState = useGlobalNotificationState();

    const dmMember = useDmMember(room);
    const isDirectMessage = !!dmMember;
    const e2eStatus = useEncryptionStatus(client, room);

    const notificationsEnabled = useFeatureEnabled("feature_notifications");

    const askToJoinEnabled = useFeatureEnabled("feature_ask_to_join");

    const videoClick = useCallback(
        (ev: React.MouseEvent) => videoCallClick(ev, callOptions[0]),
        [callOptions, videoCallClick],
    );

    const toggleCallButton = (
        <Tooltip label={isViewingCall ? _t("voip|minimise_call") : _t("voip|maximise_call")}>
            <IconButton onClick={toggleCall}>
                {/* <VideoCallIcon /> */}
                <img src={VideoIcon} alt="Video Call" />
            </IconButton>
        </Tooltip>
    );

    const joinCallButton = (
        <Tooltip label={videoCallDisabledReason ?? _t("voip|video_call")}>
            <Button
                size="sm"
                onClick={videoClick}
                Icon={VideoCallIcon}
                className="mx_RoomHeader_join_button"
                disabled={!!videoCallDisabledReason}
                color="primary"
                aria-label={videoCallDisabledReason ?? _t("action|join")}
            >
                {/* <VideoCallIcon /> */}
                <img src={VideoIcon} alt="Video Call" />
                {_t("action|join")}
            </Button>
        </Tooltip>
    );

    const callIconWithTooltip = (
        <Tooltip label={videoCallDisabledReason ?? _t("voip|video_call")}>
            {/* <VideoCallIcon /> */}
            <img src={VideoIcon} alt="Video Call" />
        </Tooltip>
    );

    const [menuOpen, setMenuOpen] = useState(false);

    const onOpenChange = useCallback(
        (newOpen: boolean) => {
            if (!videoCallDisabledReason) setMenuOpen(newOpen);
        },
        [videoCallDisabledReason],
    );

    const startVideoCallButton = (
        <>
            {/* Can be either a menu or just a button depending on the number of call options.*/}
            {callOptions.length > 1 ? (
                <Menu
                    open={menuOpen}
                    onOpenChange={onOpenChange}
                    title={_t("voip|video_call_using")}
                    trigger={
                        <button
                            disabled={!!videoCallDisabledReason}
                            aria-label={videoCallDisabledReason ?? _t("voip|video_call")}
                            className="mx_RoomHeader_action_button"
                        >
                            {callIconWithTooltip}
                        </button>
                    }
                    side="left"
                    align="start"
                >
                    {callOptions.map((option) => {
                        const { label, children } = getPlatformCallTypeProps(option);
                        return (
                            <MenuItem
                                key={option}
                                label={label}
                                aria-label={label}
                                children={children}
                                className="mx_RoomHeader_videoCallOption"
                                onClick={(ev) => {
                                    setMenuOpen(false);
                                    videoCallClick(ev, option);
                                }}
                                Icon={VideoCallIcon}
                                onSelect={() => {} /* Dummy handler since we want the click event.*/}
                            />
                        );
                    })}
                </Menu>
            ) : (
                <button
                    disabled={!!videoCallDisabledReason}
                    aria-label={videoCallDisabledReason ?? _t("voip|video_call")}
                    onClick={videoClick}
                    className="mx_RoomHeader_action_button"
                >
                    {callIconWithTooltip}
                </button>
            )}
        </>
    );
    let voiceCallButton: JSX.Element | undefined = (
        <Tooltip label={voiceCallDisabledReason ?? _t("voip|voice_call")}>
            <button
                // We need both: isViewingCall and isConnectedToCall
                //  - in the Lobby we are viewing a call but are not connected to it.
                //  - in pip view we are connected to the call but not viewing it.
                disabled={!!voiceCallDisabledReason || isViewingCall || isConnectedToCall}
                aria-label={voiceCallDisabledReason ?? _t("voip|voice_call")}
                onClick={(ev) => voiceCallClick(ev, callOptions[0])}
                className="mx_RoomHeader_action_button"
            >
                {/* <VoiceCallIcon /> */}
                <img src={CallIcon} alt="Voice Call" />
            </button>
        </Tooltip>
    );
    const closeLobbyButton = (
        <Tooltip label={_t("voip|close_lobby")}>
            <button onClick={toggleCall} className="mx_RoomHeader_action_button">
                <CloseCallIcon />
            </button>
        </Tooltip>
    );
    let videoCallButton: JSX.Element | undefined = startVideoCallButton;
    if (isConnectedToCall) {
        videoCallButton = toggleCallButton;
    } else if (isViewingCall) {
        videoCallButton = closeLobbyButton;
    }

    if (!showVideoCallButton) {
        videoCallButton = undefined;
    }
    if (!showVoiceCallButton) {
        voiceCallButton = undefined;
    }

    const roomContext = useScopedRoomContext("mainSplitContentType");
    const isVideoRoom = calcIsVideoRoom(room);
    const showChatButton =
        isVideoRoom ||
        roomContext.mainSplitContentType === MainSplitContentType.MaximisedWidget ||
        roomContext.mainSplitContentType === MainSplitContentType.Call;

    const onAvatarClick = (): void => {
        defaultDispatcher.dispatch({
            action: "open_room_settings",
            initial_tab_id: RoomSettingsTab.General,
        });
    };

    return (
        <>
            <CurrentRightPanelPhaseContextProvider roomId={room.roomId}>
                <Flex as="header" align="center" gap="4px" className="mx_RoomHeader light-panel">
                    <WithPresenceIndicator room={room} size="8px" mr="4px">
                        {/* We hide this from the tabIndex list as it is a pointer shortcut and superfluous for a11y */}
                        <RoomAvatar
                            room={room}
                            size="40px"
                            oobData={oobData}
                            onClick={onAvatarClick}
                            tabIndex={-1}
                            aria-label={_t("room|header_avatar_open_settings_label")}
                        />
                    </WithPresenceIndicator>

                    <button
                        aria-label={_t("right_panel|room_summary_card|title")}
                        tabIndex={0}
                        onClick={() => RightPanelStore.instance.showOrHidePhase(RightPanelPhases.RoomSummary)}
                        className="mx_RoomHeader_infoWrapper"
                    >
                        <Box flex="1" className="mx_RoomHeader_info">
                            <BodyText
                                as="div"
                                size="lg"
                                weight="semibold"
                                dir="auto"
                                role="heading"
                                aria-level={1}
                                className="mx_RoomHeader_heading"
                            >
                                <Tooltip label={roomName} placement="bottom">
                                    <span className="mx_RoomHeader_truncated mx_lineClamp">{roomName}</span>
                                </Tooltip>

                                {!isDirectMessage && joinRule === JoinRule.Public && (
                                    <Tooltip label={_t("common|public_room")} placement="right">
                                        <PublicIcon
                                            width="16px"
                                            height="16px"
                                            className="mx_RoomHeader_icon text-secondary"
                                            aria-label={_t("common|public_room")}
                                        />
                                    </Tooltip>
                                )}

                                {isDirectMessage && e2eStatus === E2EStatus.Verified && (
                                    <Tooltip label={_t("common|verified")} placement="right">
                                        <VerifiedIcon
                                            width="16px"
                                            height="16px"
                                            className="mx_RoomHeader_icon mx_Verified"
                                            aria-label={_t("common|verified")}
                                        />
                                    </Tooltip>
                                )}

                                {isDirectMessage && e2eStatus === E2EStatus.Warning && (
                                    <Tooltip label={_t("room|header_untrusted_label")} placement="right">
                                        <ErrorIcon
                                            width="16px"
                                            height="16px"
                                            className="mx_RoomHeader_icon mx_Untrusted"
                                            aria-label={_t("room|header_untrusted_label")}
                                        />
                                    </Tooltip>
                                )}
                            </BodyText>
                        </Box>
                    </button>

                    {additionalButtons?.map((props) => {
                        const label = props.label();

                        return (
                            <Tooltip label={label} key={props.id}>
                                <IconButton
                                    aria-label={label}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        props.onClick();
                                    }}
                                >
                                    {typeof props.icon === "function" ? props.icon() : props.icon}
                                </IconButton>
                            </Tooltip>
                        );
                    })}

                    {/* Tab Navigation */}
                    <div className="mx_TabbedRoomHeader_tabs">
                        <AccessibleButton
                            className={classNames("mx_TabbedRoomHeader_tab", {
                                "mx_TabbedRoomHeader_tab--active": activeTab === RoomContentTab.Chat,
                            })}
                            onClick={() => setActiveTab(RoomContentTab.Chat)}
                            aria-label="Chat"
                        >
                            <ChatIcon width="16" height="16" className="mx_TabbedRoomHeader_tab_icon" />
                            Chat
                        </AccessibleButton>
                        {/* Hide Images tab in rooms (only show in DMs) */}
                        {isDM && (
                            <AccessibleButton
                                className={classNames("mx_TabbedRoomHeader_tab", {
                                    "mx_TabbedRoomHeader_tab--active": activeTab === RoomContentTab.Images,
                                })}
                                onClick={() => setActiveTab(RoomContentTab.Images)}
                                aria-label="Images"
                            >
                                <ImageIcon width="16" height="16" className="mx_TabbedRoomHeader_tab_icon" />
                                Images
                            </AccessibleButton>
                        )}
                        <AccessibleButton
                            className={classNames("mx_TabbedRoomHeader_tab", {
                                "mx_TabbedRoomHeader_tab--active": activeTab === RoomContentTab.Files,
                            })}
                            onClick={() => setActiveTab(RoomContentTab.Files)}
                            aria-label="Files"
                        >
                            <AttachmentIcon width="16" height="16" className="mx_TabbedRoomHeader_tab_icon" />
                            Files
                        </AccessibleButton>
                        {/* Hide Links tab in DMs (only show in rooms) */}
                        {!isDM && (
                            <AccessibleButton
                                className={classNames("mx_TabbedRoomHeader_tab", {
                                    "mx_TabbedRoomHeader_tab--active": activeTab === RoomContentTab.Links,
                                })}
                                onClick={() => setActiveTab(RoomContentTab.Links)}
                                aria-label="Links"
                            >
                                <ExternalLinkIcon width="16" height="16" className="mx_TabbedRoomHeader_tab_icon" />
                                Links
                            </AccessibleButton>
                        )}
                    </div>

                    {isViewingCall && <CallGuestLinkButton room={room} />}

                    {hasActiveCallSession && !isConnectedToCall && !isViewingCall ? (
                        joinCallButton
                    ) : (
                        <>
                            {!isVideoRoom && videoCallButton}
                            {!useElementCallExclusively && !isVideoRoom && voiceCallButton}
                        </>
                    )}

                    {showChatButton && <VideoRoomChatButton room={room} />}

                    

                    {/* <Tooltip label={_t("common|threads")}>
                        <IconButton
                            indicator={notificationLevelToIndicator(threadNotifications)}
                            onClick={(evt) => {
                                evt.stopPropagation();
                                RightPanelStore.instance.showOrHidePhase(RightPanelPhases.ThreadPanel);
                                PosthogTrackers.trackInteraction("WebRoomHeaderButtonsThreadsButton", evt);
                            }}
                            aria-label={_t("common|threads")}
                        >
                            <ToggleableIcon Icon={ThreadsIcon} phase={RightPanelPhases.ThreadPanel} />
                        </IconButton>
                    </Tooltip> */}
                    {notificationsEnabled && (
                        <Tooltip label={_t("notifications|enable_prompt_toast_title")}>
                            <IconButton
                                indicator={notificationLevelToIndicator(globalNotificationState.level)}
                                onClick={(evt) => {
                                    evt.stopPropagation();
                                    RightPanelStore.instance.showOrHidePhase(RightPanelPhases.NotificationPanel);
                                }}
                                aria-label={_t("notifications|enable_prompt_toast_title")}
                            >
                                <ToggleableIcon Icon={NotificationsIcon} phase={RightPanelPhases.NotificationPanel} />
                            </IconButton>
                        </Tooltip>
                    )}

                    {/* <Tooltip label={_t("right_panel|room_summary_card|title")}>
                        <IconButton
                            onClick={(evt) => {
                                evt.stopPropagation();
                                RightPanelStore.instance.showOrHidePhase(RightPanelPhases.RoomSummary);
                            }}
                            aria-label={_t("right_panel|room_summary_card|title")}
                        >
                            <ToggleableIcon Icon={RoomInfoIcon} phase={RightPanelPhases.RoomSummary} />
                        </IconButton>
                    </Tooltip> */}

                    {!isDirectMessage && (
                        <Flex>
                            {/* <FacePile
                                className="mx_RoomHeader_members"
                                members={members.slice(0, 3)}
                                size="20px"
                                overflow={false}
                                viewUserOnClick={false}
                                tooltipLabel={_t("room|header_face_pile_tooltip")}
                                onClick={(e: ButtonEvent) => {
                                    RightPanelStore.instance.showOrHidePhase(RightPanelPhases.MemberList);
                                    e.stopPropagation();
                                }}
                                aria-label={_t("common|n_members", { count: memberCount })}
                            >
                                {formatCount(memberCount)}
                            </FacePile> */}
                            <button
                                className="mx_RoomHeader_action_button"
                                aria-label={_t("common|n_members", { count: memberCount })}
                                onClick={(e: ButtonEvent) => {
                                    RightPanelStore.instance.showOrHidePhase(RightPanelPhases.MemberList);
                                    e.stopPropagation();
                                }}>
                                <GroupIcon />
                                {formatCount(memberCount)}
                            </button>
                        </Flex>
                    )}

                </Flex>

                {askToJoinEnabled && <RoomKnocksBar room={room} />}
            </CurrentRightPanelPhaseContextProvider>
        </>
    );
}
