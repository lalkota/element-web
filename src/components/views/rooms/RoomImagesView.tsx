/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useEffect, useCallback, type JSX } from "react";
import { Room, MatrixEvent, EventType, MsgType } from "matrix-js-sdk/src/matrix";
import { Text } from "@vector-im/compound-web";
import classNames from "classnames";

import { _t } from "../../../languageHandler";
import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";
import { mediaFromMxc } from "../../../customisations/Media";
import { presentableTextForFile } from "../../../utils/FileUtils";
import { formatDate } from "../../../DateUtils";
import MFileBody from "../messages/MFileBody";
import { type IMediaEventContent } from "../../../customisations/models/IMediaEventContent";

interface IProps {
    room: Room;
}

interface ImageEvent {
    event: MatrixEvent;
    url: string;
    thumbnailUrl?: string;
    filename: string;
    fileSize?: number;
    timestamp: number;
    sender: string;
}

export default function RoomImagesView({ room }: IProps): JSX.Element {
    const [imageEvents, setImageEvents] = useState<ImageEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const client = useMatrixClientContext();

    const loadImages = useCallback(async () => {
        if (!room) return;

        setLoading(true);
        const timeline = room.getLiveTimeline();
        const events = timeline.getEvents();
        
        const images: ImageEvent[] = [];
        
        for (const event of events) {
            if (event.getType() === EventType.RoomMessage) {
                const content = event.getContent() as IMediaEventContent;
                if (content.msgtype === MsgType.Image && content.url) {
                    const media = mediaFromMxc(content.url);
                    const thumbnailMedia = content.info?.thumbnail_url ? 
                        mediaFromMxc(content.info.thumbnail_url) : null;
                    
                    images.push({
                        event,
                        url: media.srcHttp || "",
                        thumbnailUrl: thumbnailMedia?.srcHttp,
                        filename: content.body || "Image",
                        fileSize: content.info?.size,
                        timestamp: event.getTs(),
                        sender: event.getSender() || "",
                    });
                }
            }
        }
        
        // Sort by timestamp (newest first)
        images.sort((a, b) => b.timestamp - a.timestamp);
        
        setImageEvents(images);
        setLoading(false);
    }, [room]);

    useEffect(() => {
        loadImages();
    }, [loadImages]);

    const handleImageClick = useCallback((imageEvent: ImageEvent) => {
        // TODO: Open image in lightbox/modal
        window.open(imageEvent.url, '_blank');
    }, []);

    if (loading) {
        return (
            <div className="mx_RoomImagesView mx_RoomImagesView--loading">
                <Text size="md" weight="medium">
                    Loading...
                </Text>
            </div>
        );
    }

    if (imageEvents.length === 0) {
        return (
            <div className="mx_RoomImagesView mx_RoomImagesView--empty">
                <Text size="md" weight="medium" className="mx_RoomImagesView_emptyTitle">
                    No images yet
                </Text>
                <Text size="sm" className="mx_RoomImagesView_emptyDescription">
                    Images shared in this room will appear here
                </Text>
            </div>
        );
    }

    return (
        <div className="mx_RoomImagesView">
            <div className="mx_RoomImagesView_header">
                <Text size="lg" weight="semibold">
                    Images ({imageEvents.length})
                </Text>
            </div>
            <div className="mx_RoomImagesView_grid">
                {imageEvents.map((imageEvent) => (
                    <div
                        key={imageEvent.event.getId()}
                        className="mx_RoomImagesView_item"
                        onClick={() => handleImageClick(imageEvent)}
                    >
                        <div className="mx_RoomImagesView_imageContainer">
                            <img
                                src={imageEvent.thumbnailUrl || imageEvent.url}
                                alt={imageEvent.filename}
                                className="mx_RoomImagesView_image"
                                loading="lazy"
                            />
                        </div>
                        <div className="mx_RoomImagesView_itemInfo">
                            <Text size="sm" weight="medium" className="mx_RoomImagesView_filename">
                                {imageEvent.filename}
                            </Text>
                            <Text size="xs" className="mx_RoomImagesView_metadata">
                                {formatDate(new Date(imageEvent.timestamp))}
                                {imageEvent.fileSize && (
                                    <span> • {presentableTextForFile(imageEvent.fileSize)}</span>
                                )}
                            </Text>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
