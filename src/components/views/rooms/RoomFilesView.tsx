/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useEffect, useCallback, type JSX } from "react";
import { Room, MatrixEvent, EventType, MsgType } from "matrix-js-sdk/src/matrix";
import { Text, IconButton } from "@vector-im/compound-web";
import DownloadIcon from "@vector-im/compound-design-tokens/assets/web/icons/download";

import { mediaFromMxc } from "../../../customisations/Media";
import { presentableTextForFile } from "../../../utils/FileUtils";
import { formatDate } from "../../../DateUtils";

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
}

export default function RoomFilesView({ room }: IProps): JSX.Element {
    const [fileEvents, setFileEvents] = useState<FileEvent[]>([]);
    const [loading, setLoading] = useState(true);

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
                    content.url) {
                    const media = mediaFromMxc(content.url);
                    
                    files.push({
                        event,
                        url: media.srcHttp || "",
                        filename: content.body || "File",
                        fileSize: content.info?.size,
                        mimeType: content.info?.mimetype,
                        timestamp: event.getTs(),
                        sender: event.getSender() || "",
                    });
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

    const handleDownload = useCallback((fileEvent: FileEvent) => {
        const link = document.createElement('a');
        link.href = fileEvent.url;
        link.download = fileEvent.filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            <div className="mx_RoomFilesView mx_RoomFilesView--empty">
                <Text size="md" weight="medium" className="mx_RoomFilesView_emptyTitle">
                    No files yet
                </Text>
                <Text size="sm" className="mx_RoomFilesView_emptyDescription">
                    Files shared in this room will appear here
                </Text>
            </div>
        );
    }

    return (
        <div className="mx_RoomFilesView">
            <div className="mx_RoomFilesView_header">
                <Text size="lg" weight="semibold">
                    Files ({fileEvents.length})
                </Text>
            </div>
            <div className="mx_RoomFilesView_list">
                {fileEvents.map((fileEvent) => (
                    <div
                        key={fileEvent.event.getId()}
                        className="mx_RoomFilesView_item"
                    >
                        <div className="mx_RoomFilesView_fileIcon">
                            {getFileIcon(fileEvent.mimeType, fileEvent.filename)}
                        </div>
                        <div className="mx_RoomFilesView_fileInfo">
                            <Text size="sm" weight="medium" className="mx_RoomFilesView_filename">
                                {fileEvent.filename}
                            </Text>
                            <Text size="xs" className="mx_RoomFilesView_metadata">
                                {formatDate(new Date(fileEvent.timestamp))}
                                {fileEvent.fileSize && (
                                    <span> • {presentableTextForFile(fileEvent.fileSize)}</span>
                                )}
                                {fileEvent.mimeType && (
                                    <span> • {fileEvent.mimeType}</span>
                                )}
                            </Text>
                        </div>
                        <IconButton
                            onClick={() => handleDownload(fileEvent)}
                            aria-label="Download"
                            size="sm"
                        >
                            <DownloadIcon />
                        </IconButton>
                    </div>
                ))}
            </div>
        </div>
    );
}
