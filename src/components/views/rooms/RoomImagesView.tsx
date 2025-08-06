/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useEffect, useCallback, useMemo, type JSX } from "react";
import { Room, MatrixEvent, EventType, MsgType } from "matrix-js-sdk/src/matrix";
import { Text } from "@vector-im/compound-web";

import { _t } from "../../../languageHandler";
import { mediaFromMxc } from "../../../customisations/Media";
import { formatDate } from "../../../DateUtils";
import { fileSize } from "../../../utils/FileUtils";
import { useRoomSearch } from "../../../contexts/RoomSearchContext";
import RoomSearchHeader from "./RoomSearchHeader";
import { showFileModal } from "../elements/FileModal.tsx";
import { Icon as DownloadIcon } from "../../../../res/img/element-icons/roomlist/document-download.svg";
import { Icon as VisibilityOnIcon } from "../../../../res/img/element-icons/roomlist/eye.svg";
import { Icon as InfoIcon } from "../../../../res/img/element-icons/roomlist/info-circle.svg";

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
    mimeType?: string;
    isEncrypted: boolean;
}

export default function RoomImagesView({ room }: IProps): JSX.Element {
    const [imageEvents, setImageEvents] = useState<ImageEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const { searchQuery, selectedDate } = useRoomSearch();

    const loadImages = useCallback(async () => {
        if (!room) return;

        setLoading(true);
        const timeline = room.getLiveTimeline();
        const events = timeline.getEvents();
        
        const images: ImageEvent[] = [];
        
        for (const event of events) {
            if (event.getType() === EventType.RoomMessage) {
                const content = event.getContent();
                if (content.msgtype === MsgType.Image && content.url) {
                    const media = mediaFromMxc(content.url);
                    const thumbnailMedia = content.info?.thumbnail_url ? 
                        mediaFromMxc(content.info.thumbnail_url) : null;
                    
                    images.push({
                        event,
                        url: media.srcHttp || "",
                        thumbnailUrl: thumbnailMedia?.srcHttp || undefined,
                        filename: content.body || "Image",
                        fileSize: content.info?.size,
                        mimeType: content.info?.mimetype,
                        timestamp: event.getTs(),
                        sender: event.getSender() || "",
                        isEncrypted: event.isEncrypted(),
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

    // Force re-render when search query or selected date changes
    useEffect(() => {
        console.log("Images search params changed - query:", searchQuery, "date:", selectedDate);
    }, [searchQuery, selectedDate]);
    
    // Filter images based on search query and selected date
    const filteredImages = useMemo(() => {
        let filtered = imageEvents;
        console.log("Filtering images with query:", searchQuery, "and date:", selectedDate);

        // Filter by search query
        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter((image) => 
                image.filename.toLowerCase().includes(query) ||
                image.sender.toLowerCase().includes(query)
            );
            console.log("After query filter:", filtered.length, "images remain");
        }

        // Filter by selected date
        if (selectedDate) {
            const selectedDateObj = new Date(selectedDate);
            filtered = filtered.filter((image) => {
                const imageDate = new Date(image.timestamp);
                return imageDate.toDateString() === selectedDateObj.toDateString();
            });
            console.log("After date filter:", filtered.length, "images remain");
        }

        return filtered;
    }, [imageEvents, searchQuery, selectedDate]);

    const handleView = useCallback((imageEvent: ImageEvent) => {
        try {
            showFileModal({
                event: imageEvent.event,
                url: imageEvent.url,
                filename: imageEvent.filename,
                fileSize: imageEvent.fileSize,
                mimeType: imageEvent.mimeType,
                isEncrypted: imageEvent.isEncrypted,
            });
        } catch (error) {
            console.error("Error showing image in modal:", error);
            // Fall back to opening in new tab if modal fails
            window.open(imageEvent.url, '_blank');
        }
    }, []);
    
    const handleDownload = useCallback(async (imageEvent: ImageEvent) => {
        try {
            const response = await fetch(imageEvent.url);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = imageEvent.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the blob URL
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error in handleDownload:", error);
            // Fallback to direct download
            window.open(imageEvent.url, '_blank');
        }
    }, []);
    
    const handleInfo = useCallback((imageEvent: ImageEvent) => {
        const fileInfo = {
            name: imageEvent.filename,
            size: imageEvent.fileSize ? fileSize(imageEvent.fileSize, { base: 2, standard: "jedec" }) : 'Unknown',
            type: imageEvent.mimeType || 'Image',
            date: formatDate(new Date(imageEvent.timestamp)),
            sender: imageEvent.sender
        };
        
        // For now, just show an alert with the info
        alert(`Image Information:\n\nName: ${fileInfo.name}\nSize: ${fileInfo.size}\nType: ${fileInfo.type}\nUploaded: ${fileInfo.date}\nSender: ${fileInfo.sender}`);
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
            <div className="mx_RoomImagesView">
                <RoomSearchHeader room={room} showDateFilter={true} />
                <div className="mx_RoomImagesView mx_RoomImagesView--empty">
                    <Text size="md" weight="medium" className="mx_RoomImagesView_emptyTitle">
                        No images yet
                    </Text>
                    <Text size="sm" className="mx_RoomImagesView_emptyDescription">
                        Images shared in this room will appear here
                    </Text>
                </div>
            </div>
        );
    }

    if (filteredImages.length === 0) {
        return (
            <div className="mx_RoomImagesView">
                <RoomSearchHeader room={room} showDateFilter={true} />
                <div className="mx_RoomImagesView mx_RoomImagesView--empty">
                    <Text size="md" weight="medium" className="mx_RoomImagesView_emptyTitle">
                        No images found
                    </Text>
                    <Text size="sm" className="mx_RoomImagesView_emptyDescription">
                        Try adjusting your search or date filter
                    </Text>
                </div>
            </div>
        );
    }

    return (
        <div className="mx_RoomImagesView">
            <RoomSearchHeader room={room} showDateFilter={true} />
            <div className="mx_RoomImagesView_header">
                <Text size="lg" weight="semibold">
                    Images ({filteredImages.length})
                </Text>
            </div>
            <div className="mx_RoomImagesView_grid">
                {filteredImages.map((imageEvent) => (
                    <div
                        key={imageEvent.event.getId()}
                        className="mx_RoomImagesView_item"
                    >
                        <div className="mx_RoomImagesView_imageContainer">
                            <img
                                src={imageEvent.thumbnailUrl || imageEvent.url}
                                alt={imageEvent.filename}
                                className="mx_RoomImagesView_image"
                                loading="lazy"
                                onClick={() => handleView(imageEvent)}
                            />
                        </div>
                        <div className="mx_RoomImagesView_itemInfo">
                            <Text size="sm" weight="medium" className="mx_RoomImagesView_filename">
                                {imageEvent.filename}
                            </Text>
                            <Text size="xs" className="mx_RoomImagesView_metadata">
                                {formatDate(new Date(imageEvent.timestamp))}
                                {imageEvent.fileSize && (
                                    <span> • {fileSize(imageEvent.fileSize, { base: 2, standard: "jedec" })}</span>
                                )}
                            </Text>
                        </div>
                        <div className="mx_RoomImagesView_actions">
                            <button 
                                className="mx_RoomImagesView_actionButton"
                                onClick={() => handleView(imageEvent)}
                                title="View"
                                aria-label="View image"
                            >
                                <VisibilityOnIcon />
                            </button>
                            <button 
                                className="mx_RoomImagesView_actionButton"
                                onClick={() => handleDownload(imageEvent)}
                                title="Download"
                                aria-label="Download image"
                            >
                                <DownloadIcon />
                            </button>
                            <button 
                                className="mx_RoomImagesView_actionButton"
                                onClick={() => handleInfo(imageEvent)}
                                title="Info"
                                aria-label="Image information"
                            >
                                <InfoIcon />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
