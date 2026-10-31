import React, { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../providers/ThemeProvider";

export const TRACKER_PALETTE = {
    bg: "#0B0C10",
    surface: "#121318",
    surfaceElevated: "#181A22",
    surfaceMuted: "#1E202B",
    border: "#222530",
    borderStrong: "#2E3242",
    text: "#F3F4F6",
    textSecondary: "#9CA3AF",
    muted: "#6B7280",
    purple: "#8B5CF6",
    purpleLight: "#A78BFA",
    purpleGlow: "rgba(139, 92, 246, 0.16)",
    purpleBorder: "rgba(139, 92, 246, 0.42)",
    emerald: "#10B981",
    emeraldGlow: "rgba(16, 185, 129, 0.14)",
    emeraldBorder: "rgba(16, 185, 129, 0.35)",
    amber: "#F59E0B",
    amberGlow: "rgba(245, 158, 11, 0.14)",
    amberBorder: "rgba(245, 158, 11, 0.35)",
    cyan: "#38BDF8",
    cyanGlow: "rgba(56, 189, 248, 0.14)",
    danger: "#EF4444",
    dangerGlow: "rgba(239, 68, 68, 0.14)",
};

export const LIGHT_TRACKER_PALETTE: typeof TRACKER_PALETTE = {
    bg: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceElevated: "#F1F5F9",
    surfaceMuted: "#E2E8F0",
    border: "#E2E8F0",
    borderStrong: "#CBD5E1",
    text: "#0F172A",
    textSecondary: "#334155",
    muted: "#64748B",
    purple: "#7C3AED",
    purpleLight: "#6D28D9",
    purpleGlow: "rgba(124, 58, 237, 0.10)",
    purpleBorder: "rgba(124, 58, 237, 0.32)",
    emerald: "#059669",
    emeraldGlow: "rgba(5, 150, 105, 0.10)",
    emeraldBorder: "rgba(5, 150, 105, 0.30)",
    amber: "#D97706",
    amberGlow: "rgba(217, 119, 6, 0.10)",
    amberBorder: "rgba(217, 119, 6, 0.30)",
    cyan: "#0284C7",
    cyanGlow: "rgba(2, 132, 199, 0.10)",
    danger: "#DC2626",
    dangerGlow: "rgba(220, 38, 38, 0.10)",
};

export type TrackerPalette = typeof TRACKER_PALETTE;

export function useTrackerPalette(): TrackerPalette {
    const { mode } = useAppTheme();
    return mode === "dark" ? TRACKER_PALETTE : LIGHT_TRACKER_PALETTE;
}

/**
 * Connected-node web background motif for the Syllabus Tracker header.
 */
export function KnowledgeWebMotif() {
    const palette = useTrackerPalette();
    return (
        <View style={styles.motifContainer} pointerEvents="none">
            <View style={[styles.motifLine, styles.lineA, { backgroundColor: palette.purpleBorder }]} />
            <View style={[styles.motifLine, styles.lineB, { backgroundColor: palette.purpleBorder }]} />
            <View style={[styles.motifLine, styles.lineC, { backgroundColor: palette.purpleBorder }]} />
            <View style={[styles.motifNode, styles.nodeA, { backgroundColor: palette.purple, borderColor: palette.bg }]} />
            <View style={[styles.motifNode, styles.nodeB, styles.nodeGlow, { backgroundColor: palette.purpleLight, borderColor: palette.bg }]} />
            <View style={[styles.motifNode, styles.nodeC, { backgroundColor: palette.purple, borderColor: palette.bg }]} />
            <View style={[styles.motifNode, styles.nodeD, styles.nodeEmerald, { backgroundColor: palette.emerald, borderColor: palette.bg }]} />
        </View>
    );
}

/**
 * Circular orbit progress dial showing percentage covered.
 */
export function CoverageOrbitDial({
    percentage,
    coveredCount,
    totalCount,
    isHistorical,
}: {
    percentage: number;
    coveredCount: number;
    totalCount: number;
    isHistorical?: boolean;
}) {
    const palette = useTrackerPalette();
    const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
    const accentColor = isHistorical
        ? palette.amber
        : clamped === 100 && totalCount > 0
          ? palette.emerald
          : palette.purple;

    const totalDots = 12;
    const filledDots = Math.round((clamped / 100) * totalDots);

    return (
        <View style={styles.dialContainer}>
            <View
                style={[
                    styles.dialOuterRing,
                    {
                        borderColor: isHistorical
                            ? palette.amberBorder
                            : palette.purpleBorder,
                        backgroundColor: isHistorical
                            ? palette.amberGlow
                            : palette.purpleGlow,
                    },
                ]}
            >
                <View style={[styles.dialInnerCircle, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <Text style={[styles.dialPercentText, { color: accentColor }]}>
                        {clamped}%
                    </Text>
                    <Text style={[styles.dialRatioText, { color: palette.textSecondary }]}>
                        {coveredCount}/{totalCount}
                    </Text>
                    <Text style={[styles.dialSubLabel, { color: palette.muted }]}>TOPICS</Text>
                </View>
            </View>
            <View style={styles.dotStrip}>
                {Array.from({ length: totalDots }).map((_, idx) => {
                    const active = idx < filledDots;
                    return (
                        <View
                            key={idx}
                            style={[
                                styles.segmentDot,
                                { backgroundColor: palette.borderStrong },
                                active && {
                                    backgroundColor: accentColor,
                                },
                            ]}
                        />
                    );
                })}
            </View>
        </View>
    );
}

/**
 * Connected-web status node for a chapter row.
 */
export function ChapterStatusNode({
    status,
    isLast,
}: {
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    isLast?: boolean;
}) {
    const palette = useTrackerPalette();
    const isCompleted = status === "COMPLETED";
    const isInProgress = status === "IN_PROGRESS";

    return (
        <View style={styles.nodeColumn}>
            <View
                style={[
                    styles.chapterNodeOuter,
                    { borderColor: palette.borderStrong, backgroundColor: palette.surfaceElevated },
                    isCompleted && {
                        borderColor: palette.emerald,
                        backgroundColor: palette.emeraldGlow,
                    },
                    isInProgress && {
                        borderColor: palette.amber,
                        backgroundColor: palette.amberGlow,
                    },
                ]}
            >
                {isCompleted ? (
                    <Ionicons
                        name="checkmark"
                        size={11}
                        color={palette.emerald}
                    />
                ) : isInProgress ? (
                    <View style={[styles.inProgressDot, { backgroundColor: palette.amber }]} />
                ) : (
                    <View style={[styles.notStartedDot, { backgroundColor: palette.muted }]} />
                )}
            </View>
            {!isLast && (
                <View
                    style={[
                        styles.connectorLine,
                        { backgroundColor: palette.border },
                        isCompleted && {
                            backgroundColor: palette.emeraldBorder,
                        },
                        isInProgress && {
                            backgroundColor: palette.amberBorder,
                        },
                    ]}
                />
            )}
        </View>
    );
}

/**
 * Smooth animated horizontal progress bar.
 */
export function AnimatedCoverageBar({
    percentage,
    color = TRACKER_PALETTE.purple,
    height = 7,
}: {
    percentage: number;
    color?: string;
    height?: number;
}) {
    const palette = useTrackerPalette();
    const clamped = Math.max(0, Math.min(100, percentage));
    const [widthAnim] = useState(() => new Animated.Value(clamped));

    useEffect(() => {
        Animated.timing(widthAnim, {
            toValue: clamped,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [clamped, widthAnim]);

    const widthInterpolated = widthAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ["0%", "100%"],
    });

    return (
        <View style={[styles.barTrack, { height, backgroundColor: palette.surfaceMuted }]}>
            <Animated.View
                style={[
                    styles.barFill,
                    {
                        height,
                        backgroundColor: color,
                        width: widthInterpolated,
                    },
                ]}
            />
        </View>
    );
}

/**
 * Weekly activity bar chart showing topics covered across recent days/weeks.
 */
export function WeeklyActivityCard({
    timelineDates,
}: {
    timelineDates: { date: string; topicsCount: number; lecturesCount: number }[];
}) {
    const palette = useTrackerPalette();
    const recent = [...timelineDates].slice(0, 7).reverse();
    const maxCount = Math.max(1, ...recent.map((d) => d.topicsCount));

    if (recent.length === 0) {
        return null;
    }

    return (
        <View style={[styles.activityCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.activityHeader}>
                <View style={styles.activityTitleRow}>
                    <Ionicons
                        name="pulse-outline"
                        size={15}
                        color={palette.purpleLight}
                    />
                    <Text style={[styles.activityTitle, { color: palette.text }]}>Recent Lecture Velocity</Text>
                </View>
                <Text style={[styles.activitySub, { color: palette.muted }]}>
                    Last {recent.length} active session{recent.length === 1 ? "" : "s"}
                </Text>
            </View>
            <View style={styles.chartRow}>
                {recent.map((item) => {
                    const ratio = Math.max(0.15, item.topicsCount / maxCount);
                    const barHeight = Math.round(ratio * 48);
                    const shortLabel = item.date.slice(5); // MM-DD
                    return (
                        <View key={item.date} style={styles.chartCol}>
                            <Text style={[styles.chartCount, { color: palette.purpleLight }]}>{item.topicsCount}</Text>
                            <View style={[styles.chartTrack, { backgroundColor: palette.surfaceMuted }]}>
                                <View
                                    style={[
                                        styles.chartBar,
                                        { height: barHeight, backgroundColor: palette.purple },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.chartLabel, { color: palette.textSecondary }]}>{shortLabel}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    motifContainer: {
        position: "absolute",
        right: 12,
        top: 10,
        width: 120,
        height: 76,
        opacity: 0.45,
    },
    motifLine: {
        position: "absolute",
        height: 1.5,
    },
    lineA: {
        width: 48,
        top: 22,
        left: 16,
        transform: [{ rotate: "18deg" }],
    },
    lineB: {
        width: 42,
        top: 34,
        left: 56,
        transform: [{ rotate: "-24deg" }],
    },
    lineC: {
        width: 38,
        top: 48,
        left: 34,
        transform: [{ rotate: "32deg" }],
    },
    motifNode: {
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1.5,
    },
    nodeA: { top: 14, left: 12 },
    nodeB: { top: 26, left: 56 },
    nodeC: { top: 12, left: 94 },
    nodeD: { top: 52, left: 66 },
    nodeGlow: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    nodeEmerald: {},

    dialContainer: {
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    dialOuterRing: {
        width: 94,
        height: 94,
        borderRadius: 47,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
        padding: 6,
    },
    dialInnerCircle: {
        width: 78,
        height: 78,
        borderRadius: 39,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    dialPercentText: {
        fontSize: 20,
        fontWeight: "900",
        letterSpacing: -0.5,
    },
    dialRatioText: {
        fontSize: 11,
        fontWeight: "700",
        marginTop: 1,
    },
    dialSubLabel: {
        fontSize: 8,
        fontWeight: "800",
        letterSpacing: 1,
        marginTop: 1,
    },
    dotStrip: {
        flexDirection: "row",
        gap: 3,
        alignItems: "center",
    },
    segmentDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },

    nodeColumn: {
        width: 24,
        alignItems: "center",
    },
    chapterNodeOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
    inProgressDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    notStartedDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    connectorLine: {
        width: 2,
        flex: 1,
        minHeight: 16,
        marginVertical: 2,
        borderRadius: 1,
    },

    barTrack: {
        width: "100%",
        borderRadius: 999,
        overflow: "hidden",
    },
    barFill: {
        borderRadius: 999,
    },

    activityCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        gap: 12,
    },
    activityHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 6,
    },
    activityTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    activityTitle: {
        fontSize: 13,
        fontWeight: "800",
    },
    activitySub: {
        fontSize: 11,
        fontWeight: "600",
    },
    chartRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-around",
        paddingTop: 6,
        gap: 8,
    },
    chartCol: {
        alignItems: "center",
        flex: 1,
        gap: 4,
    },
    chartCount: {
        fontSize: 10,
        fontWeight: "800",
    },
    chartTrack: {
        height: 50,
        width: "100%",
        maxWidth: 28,
        borderRadius: 6,
        justifyContent: "flex-end",
        overflow: "hidden",
    },
    chartBar: {
        width: "100%",
        borderRadius: 6,
    },
    chartLabel: {
        fontSize: 9,
        fontWeight: "700",
    },
});
