/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useEffect, useCallback, useMemo, type JSX } from "react";
import { Room, MatrixEvent, EventType, MsgType } from "matrix-js-sdk/src/matrix";
import { MediaEventHelper } from "../../../utils/MediaEventHelper.ts";
import { Text, IconButton } from "@vector-im/compound-web";
import DownloadIcon from "../../../../res/img/element-icons/roomlist/document-download.svg";
import VisibilityOnIcon from "../../../../res/img/element-icons/roomlist/eye.svg";
import ShareIcon from "../../../../res/img/element-icons/roomlist/forward-square.svg";
import InfoIcon from "../../../../res/img/element-icons/roomlist/info-circle.svg";

import { mediaFromMxc } from "../../../customisations/Media";
import { fileSize } from "../../../utils/FileUtils";
import { formatDate } from "../../../DateUtils";
import { useRoomSearch } from "../../../contexts/RoomSearchContext";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import RoomSearchHeader from "./RoomSearchHeader";

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
    const [loading, setLoading] = useState(true);
    const { searchQuery, selectedDate } = useRoomSearch();

    const loadFiles = useCallback(async () => {
        if (!room) return;

        setLoading(true);
        const timeline = room.getLiveTimeline();
        const events = timeline.getEvents();
        
        const files: FileEvent[] = [];
        
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
        
        // Sort by timestamp (newest first)
        files.sort((a, b) => b.timestamp - a.timestamp);
        
        setFileEvents(files);
        setLoading(false);
    }, [room]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    // Filter and group files based on search query and selected date
    const { filteredFiles, groupedFiles } = useMemo(() => {
        let filtered = fileEvents;

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((file) => 
                file.filename.toLowerCase().includes(query) ||
                file.sender.toLowerCase().includes(query) ||
                (file.mimeType && file.mimeType.toLowerCase().includes(query))
            );
        }

        // Filter by selected date
        if (selectedDate) {
            const selectedDateObj = new Date(selectedDate);
            filtered = filtered.filter((file) => {
                const fileDate = new Date(file.timestamp);
                return fileDate.toDateString() === selectedDateObj.toDateString();
            });
        }

        // Group files by type
        const groups: { [key: string]: FileEvent[] } = {
            "Photos and videos": [],
            "Documents": [],
            "Other files": []
        };

        filtered.forEach((file) => {
            if (file.mimeType?.startsWith("image/") || file.mimeType?.startsWith("video/")) {
                groups["Photos and videos"].push(file);
            } else if (
                file.mimeType?.includes("pdf") ||
                file.mimeType?.includes("word") ||
                file.mimeType?.includes("sheet") ||
                file.mimeType?.includes("presentation") ||
                file.filename?.match(/\.(doc|docx|pdf|xls|xlsx|ppt|pptx)$/i)
            ) {
                groups["Documents"].push(file);
            } else {
                groups["Other files"].push(file);
            }
        });

        // Remove empty groups
        const nonEmptyGroups = Object.entries(groups).filter(([, files]) => files.length > 0);

        return {
            filteredFiles: filtered,
            groupedFiles: nonEmptyGroups
        };
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

    const handleView = useCallback(async (fileEvent: FileEvent) => {
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

    const handleShare = useCallback(async (fileEvent: FileEvent) => {
        try {
            if (navigator.share && fileEvent.isEncrypted) {
                // For encrypted files, we need to get the blob first
                const blob = await downloadFile(fileEvent);
                
                if (blob) {
                    const file = new File([blob], fileEvent.filename, { type: fileEvent.mimeType || 'application/octet-stream' });
                    await navigator.share({
                        title: fileEvent.filename,
                        files: [file],
                    });
                }
            } else if (navigator.share && !fileEvent.isEncrypted) {
                // For unencrypted files, share the URL
                await navigator.share({
                    title: fileEvent.filename,
                    url: fileEvent.url,
                });
            } else {
                // Fallback to copying URL to clipboard (only works for unencrypted files)
                if (!fileEvent.isEncrypted) {
                    await handleCopyLink(fileEvent);
                } else {
                    console.log("Cannot share encrypted file - no native share API available");
                    // TODO: Show appropriate message to user
                }
            }
        } catch (error) {
            console.log('Error sharing:', error);
            // Fallback to copying URL to clipboard for unencrypted files
            if (!fileEvent.isEncrypted) {
                handleCopyLink(fileEvent);
            }
        }
    }, [downloadFile]);

    const handleCopyLink = useCallback(async (fileEvent: FileEvent) => {
        if (fileEvent.isEncrypted) {
            console.log("Cannot copy link for encrypted file");
            // TODO: Show appropriate message to user
            return;
        }
        
        try {
            await navigator.clipboard.writeText(fileEvent.url);
            // TODO: Show toast notification
            console.log('Link copied to clipboard');
        } catch (error) {
            console.log('Failed to copy link:', error);
        }
    }, []);

    const handleInfo = useCallback((fileEvent: FileEvent) => {
        // TODO: Open file info modal/dialog
        const fileInfo = {
            name: fileEvent.filename,
            size: fileEvent.fileSize,
            type: fileEvent.mimeType,
            uploaded: new Date(fileEvent.timestamp),
            sender: fileEvent.sender,
            url: fileEvent.url,
            encrypted: fileEvent.isEncrypted
        };
        
        // For now, log the info (can be replaced with modal later)
        console.log('File Info:', fileInfo);
        
        // Simple alert for demonstration (replace with proper modal)
        const sizeText = fileEvent.fileSize ? fileSize(fileEvent.fileSize, { base: 2, standard: "jedec" }) : 'Unknown';
        const dateText = formatDate(new Date(fileEvent.timestamp));
        const encryptionText = fileEvent.isEncrypted ? 'Yes' : 'No';
        
        alert(`File Information:\n\nName: ${fileEvent.filename}\nSize: ${sizeText}\nType: ${fileEvent.mimeType || 'Unknown'}\nUploaded: ${dateText}\nSender: ${fileEvent.sender}\nEncrypted: ${encryptionText}`);
    }, []);

    const getFileIcon = useCallback((mimeType?: string, filename?: string) => {
        if (!mimeType && !filename) return "📄";
        
        if (mimeType?.startsWith("video/")) return "🎥";
        if (mimeType?.startsWith("audio/")) return "🎵";
        if (mimeType?.includes("pdf")) return "📕";
        if (mimeType?.includes("word") || filename?.endsWith(".doc") || filename?.endsWith(".docx")) return "📝";
        if (mimeType?.includes("sheet") || filename?.endsWith(".xls") || filename?.endsWith(".xlsx")) return "📊";
        if (mimeType?.includes("presentation") || filename?.endsWith(".ppt") || filename?.endsWith(".pptx")) return "📈";
        if (mimeType?.includes("zip") || mimeType?.includes("archive")) return "🗜️";
        
        return "📄";
    }, []);

    if (loading) {
        return (
            <div className="mx_RoomFilesView mx_RoomFilesView--loading">
                <Text size="md" weight="medium">
                    Loading...
                </Text>
            </div>
        );
    }

    if (fileEvents.length === 0) {
        return (
            <div className="mx_RoomFilesView">
                <div className="mx_RoomFilesView mx_RoomFilesView--empty">
                    <Text size="md" weight="medium" className="mx_RoomFilesView_emptyTitle">
                        No files yet
                    </Text>
                    <Text size="sm" className="mx_RoomFilesView_emptyDescription">
                        Files shared in this room will appear here
                    </Text>
                </div>
            </div>
        );
    }

    if (filteredFiles.length === 0) {
        return (
            <div className="mx_RoomFilesView">
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
                    {groupedFiles.map(([groupName, files]) => (
                        <div key={groupName} className="mx_RoomFilesView_section">
                            <div className="mx_RoomFilesView_sectionHeader">
                                <h3>{groupName}</h3>
                                <span className="mx_RoomFilesView_seeAll">See All</span>
                            </div>
                            <div className="mx_RoomFilesView_list">
                                {files.map((fileEvent) => (
                                    <div
                                        key={fileEvent.event.getId()}
                                        className="mx_RoomFilesView_item"
                                    >
                                        <div className="mx_RoomFilesView_fileIcon">
                                            {getFileIcon(fileEvent.mimeType, fileEvent.filename)}

                                        </div>
                                        <div className="mx_RoomFilesView_fileInfo">
                                            <p className="mx_RoomFilesView_filename">
                                                {fileEvent.filename}
                                            </p>
                                            <p className="mx_RoomFilesView_metadata">
                                                <span>{formatDate(new Date(fileEvent.timestamp))}</span>
                                                {fileEvent.fileSize && (
                                                    <span>{fileSize(fileEvent.fileSize, { base: 2, standard: "jedec" })}</span>
                                                )}
                                            </p>
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
                                                onClick={() => handleShare(fileEvent)}
                                                aria-label="Share"
                                                title="Share"
                                                className="mx_RoomFilesView_actionButton"
                                            >
                                                <img src={ShareIcon} alt="Share" />
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
                    ))}
                </div>
            </div>
        </div>
    );
}