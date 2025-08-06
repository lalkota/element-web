/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useEffect, useCallback, useMemo, type JSX } from "react";
import { Room, MatrixEvent, EventType, MsgType } from "matrix-js-sdk/src/matrix";
import { MediaEventHelper } from "../../../utils/MediaEventHelper.ts";

import { mediaFromMxc } from "../../../customisations/Media";
import { fileSize } from "../../../utils/FileUtils";
import { formatDate } from "../../../DateUtils";
import { useRoomSearch } from "../../../contexts/RoomSearchContext";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import RoomSearchHeader from "./RoomSearchHeader";
import { Text } from "@vector-im/compound-web";
import DownloadIcon from "../../../../res/img/element-icons/roomlist/document-download.svg";
import VisibilityOnIcon from "../../../../res/img/element-icons/roomlist/eye.svg";
import InfoIcon from "../../../../res/img/element-icons/roomlist/info-circle.svg";
import { showFileModal } from "../elements/FileModal.tsx";

interface IProps {
    room: Room;
}

interface FileEvent {
    event: MatrixEvent;
    url: string;
    filename: string;
    fileSize?: number;
    mimeType?: string;
    timestamp: number;
    sender: string;
    isEncrypted: boolean;
}

export default function RoomFilesView({ room }: IProps): JSX.Element {
    const [fileEvents, setFileEvents] = useState<FileEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { searchQuery, selectedDate } = useRoomSearch();

    const loadFiles = useCallback(async () => {
        if (!room) return;

        setIsLoading(true);
        const client = MatrixClientPeg.get();
        if (!client) {
            console.error("Matrix client is not available");
            setIsLoading(false);
            return;
        }
        
        const files: FileEvent[] = [];
        
        try {
            // Get room messages with a larger limit to ensure we capture files
            // Use the room's pagination API to get more events
            const limit = 500; // Fetch more messages to find files
            
            // First try to get events from the current timeline
            const timeline = room.getLiveTimeline();
            const currentEvents = timeline.getEvents();
            
            // Process current timeline events
            processEvents(currentEvents, files);
            
            // Then fetch more historical events if needed
            if (Array.isArray(currentEvents) && currentEvents.length < 100 || files.length < 10) {
                // Only fetch more if we don't have many events or files yet
                try {
                    console.log(`Fetching more events for room ${room.roomId}`);
                    // Use the client's scrollback API to get more events
                    const moreEvents = await client.scrollback(room, limit);
                    if (moreEvents && Array.isArray(moreEvents) && moreEvents.length > 0) {
                        processEvents(moreEvents, files);
                    }
                } catch (error) {
                    console.error("Error fetching more events:", error);
                }
            }
            setIsLoading(false);
            setFileEvents(files);
        } catch (error) {
            console.error("Error loading files:", error);
            setIsLoading(false);
        }
    }, [room]);
    
    // Helper function to process events and extract file information
    const processEvents = (events: MatrixEvent[], files: FileEvent[]) => {
        for (const event of events) {
            if (event.getType() === EventType.RoomMessage) {
                const content = event.getContent() as any;
                // Include all file types except images
                if ((content.msgtype === MsgType.File || 
                     content.msgtype === MsgType.Audio || 
                     content.msgtype === MsgType.Video) && 
                    (content.url || content.file)) {
                    
                    // Check if file is encrypted
                    const isEncrypted = !!content.file;
                    const mxcUrl = content.url || content.file?.url;
                    
                    if (mxcUrl) {
                        const media = mediaFromMxc(mxcUrl);
                        
                        files.push({
                            event,
                            url: media.srcHttp || "",
                            filename: content.body || "File",
                            fileSize: content.info?.size,
                            mimeType: content.info?.mimetype,
                            timestamp: event.getTs(),
                            sender: event.getSender() || "",
                            isEncrypted,
                        });
                    }
                }
            }
        }
    };

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    // Force re-render when search query or selected date changes
    useEffect(() => {
        console.log("Search params changed - query:", searchQuery, "date:", selectedDate);
    }, [searchQuery, selectedDate]);
    
    // Filter files based on search query and selected date
    const filteredFiles = useMemo(() => {
        if (!fileEvents.length) return [];
        
        console.log(`Filtering ${fileEvents.length} files with query: '${searchQuery}' and date: ${selectedDate}`);
        
        return fileEvents.filter(fileEvent => {
            // Apply search filter if query exists
            if (searchQuery && searchQuery.trim() !== "") {
                const query = searchQuery.trim().toLowerCase();
                const filename = fileEvent.filename.toLowerCase();
                const sender = fileEvent.sender.toLowerCase();
                const mimeType = fileEvent.mimeType?.toLowerCase() || "";
                
                // Check if any field matches the query
                if (!filename.includes(query) && 
                    !sender.includes(query) && 
                    !mimeType.includes(query)) {
                    return false;
                }
            }
            
            // Apply date filter if selected
            if (selectedDate) {
                const eventDate = new Date(fileEvent.timestamp);
                const filterDate = new Date(selectedDate);
                
                // Compare dates (ignoring time)
                if (eventDate.toDateString() !== filterDate.toDateString()) {
                    return false;
                }
            }
            
            return true;
        });
    }, [fileEvents, searchQuery, selectedDate]);

    const downloadFile = useCallback(async (fileEvent: FileEvent): Promise<Blob | null> => {
        try {
            const client = MatrixClientPeg.get();
            if (!client) {
                throw new Error("Matrix client not available");
            }

            const content = fileEvent.event.getContent();
            
            if (fileEvent.isEncrypted && content.file) {
                // Handle encrypted files using MediaEventHelper
                const mediaHelper = new MediaEventHelper(fileEvent.event);
                const blob = await mediaHelper.sourceBlob.value;
                
                if (!blob) {
                    throw new Error("Failed to decrypt file");
                }
                
                return blob;
            } else {
                // Handle unencrypted files
                const response = await fetch(fileEvent.url);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return await response.blob();
            }
        } catch (error) {
            console.error("Error downloading file:", error);
            return null;
        }
    }, []);

    const handleDownload = useCallback(async (fileEvent: FileEvent) => {
        try {
            const blob = await downloadFile(fileEvent);
            
            if (!blob) {
                console.error("Failed to download file");
                // TODO: Show error toast
                return;
            }
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileEvent.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the blob URL
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error in handleDownload:", error);
            // TODO: Show error toast
        }
    }, [downloadFile]);

    const handleView = useCallback((fileEvent: FileEvent) => {
        try {
            showFileModal({
                event: fileEvent.event,
                url: fileEvent.url,
                filename: fileEvent.filename,
                fileSize: fileEvent.fileSize,
                mimeType: fileEvent.mimeType,
                isEncrypted: fileEvent.isEncrypted,
            });
        } catch (error) {
            console.error("Error showing file in modal:", error);
            // Fall back to download if modal fails
            handleDownload(fileEvent);
        }
    }, [handleDownload]);

    const handleInfo = useCallback((fileEvent: FileEvent) => {
        // TODO: Open file info modal/dialog
        const fileInfo = {
            name: fileEvent.filename,
            size: fileEvent.fileSize ? fileSize(fileEvent.fileSize, { base: 2, standard: "jedec" }) : 'Unknown',
            type: fileEvent.mimeType || 'Unknown',
            date: formatDate(new Date(fileEvent.timestamp)),
            sender: fileEvent.sender
        };
        
        // For now, just show an alert with the info
        alert(`File Information:\n\nName: ${fileInfo.name}\nSize: ${fileInfo.size}\nType: ${fileInfo.type}\nUploaded: ${fileInfo.date}\nSender: ${fileInfo.sender}`);
    }, []);
    


    if (isLoading) {
        return (
            <div>
                <RoomSearchHeader room={room} showDateFilter={true} />
                <div className="mx_RoomFilesView mx_RoomFilesView--loading">
                    <div className="mx_Spinner">
                        <div className="mx_Spinner_Msg">Loading files...</div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (!filteredFiles || filteredFiles.length === 0) {
        return (
            <div>
                <RoomSearchHeader room={room} showDateFilter={true} />
                <div className="mx_RoomFilesView mx_RoomFilesView--empty">
                    <Text size="md" weight="medium" className="mx_RoomFilesView_emptyTitle">
                        No files found
                    </Text>
                    <Text size="sm" className="mx_RoomFilesView_emptyDescription">
                        Try adjusting your search or date filter
                    </Text>
                </div>
            </div>
        );
    }

    return (
        <div>
            <RoomSearchHeader room={room} showDateFilter={true} />
            <div className="mx_RoomFilesView">
                <div className="mx_RoomFilesView_content">
                    <div className="mx_RoomFilesView_section">
                        <div className="mx_RoomFilesView_sectionHeader">
                            <Text size="md" weight="medium">Files</Text>
                        </div>
                        <div className="mx_RoomFilesView_list">
                            {filteredFiles.map((fileEvent: FileEvent) => (
                                <div
                                    key={fileEvent.event.getId()}
                                    className="mx_RoomFilesView_item"
                                >
                                    <div className="mx_RoomFilesView_fileIcon">
                                        {(() => {
                                            const mimeType = fileEvent.mimeType;
                                            const filename = fileEvent.filename;
                                            
                                            if (!mimeType && !filename) return "📄";
                                            
                                            if (mimeType?.startsWith("image/")) return "🖼️";
                                            if (mimeType?.startsWith("video/")) return "🎬";
                                            if (mimeType?.startsWith("audio/")) return "🎵";
                                            
                                            if (mimeType?.includes("pdf") || filename?.endsWith(".pdf")) return "📕";
                                            if (mimeType?.includes("word") || filename?.match(/\.(doc|docx)$/i)) return "📝";
                                            if (mimeType?.includes("sheet") || filename?.match(/\.(xls|xlsx)$/i)) return "📊";
                                            if (mimeType?.includes("presentation") || filename?.match(/\.(ppt|pptx)$/i)) return "📈";
                                            if (mimeType?.includes("zip") || mimeType?.includes("archive") || filename?.match(/\.(zip|rar|7z|tar|gz)$/i)) return "🗜️";
                                            
                                            return "📄";
                                        })()}
                                    </div>
                                    <div className="mx_RoomFilesView_fileInfo">
                                        <Text size="sm" weight="medium" className="mx_RoomFilesView_filename">
                                            {fileEvent.filename}
                                        </Text>
                                        <div className="mx_RoomFilesView_metadata">
                                            <Text size="xs">{formatDate(new Date(fileEvent.timestamp))}</Text>
                                            {fileEvent.fileSize && (
                                                <Text size="xs">{fileSize(fileEvent.fileSize, { base: 2, standard: "jedec" })}</Text>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mx_RoomFilesView_actions">
                                        <button
                                            onClick={() => handleView(fileEvent)}
                                            aria-label="View"
                                            title="View"
                                            className="mx_RoomFilesView_actionButton"
                                        >
                                            <img src={VisibilityOnIcon} alt="View" />
                                        </button>
                                        <button
                                            onClick={() => handleDownload(fileEvent)}
                                            aria-label="Download"
                                            title="Download"
                                            className="mx_RoomFilesView_actionButton"
                                        >
                                            <img src={DownloadIcon} alt="Download" />
                                        </button>
                                        <button
                                            onClick={() => handleInfo(fileEvent)}
                                            aria-label="Info"
                                            title="Info"
                                            className="mx_RoomFilesView_actionButton"
                                        >
                                            <img src={InfoIcon} alt="Info" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}