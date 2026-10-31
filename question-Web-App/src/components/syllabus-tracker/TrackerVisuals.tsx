import React, { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import type {
    TrackerChapterStatus,
    WeeklyActivityBucket,
} from "../../services/syllabus-tracker-api";

// Unified design palette tailored for Question Web's navy & purple academic workspace
export const TRACKER_PALETTE = {
    bg: "#101426",
    surface: "#191F35",
    surfaceElevated: "#252D46",
    surfaceMuted: "#212946",
    border: "#303951",
    borderStrong: "#424E6D",
    purple: "#9275F5",
    purpleDeep: "#7457D9",
    purpleGlow: "rgba(146, 117, 245, 0.16)",
    purpleBorder: "rgba(146, 117, 245, 0.40)",
    // Aliases to maintain 100% backward compatibility
    crimson: "#9275F5",
    crimsonDeep: "#7457D9",
    crimsonGlow: "rgba(146, 117, 245, 0.16)",
    crimsonBorder: "rgba(146, 117, 245, 0.40)",
    emerald: "#10B981",
    emeraldSoft: "rgba(16, 185, 129, 0.14)",
    emeraldBorder: "rgba(16, 185, 129, 0.38)",
    amber: "#F59E0B",
    amberSoft: "rgba(245, 158, 11, 0.14)",
    amberBorder: "rgba(245, 158, 11, 0.38)",
    text: "#F5F5FA",
    textSecondary: "#A3AAC0",
    muted: "#76809E",
};

/**
 * Subtle interconnected knowledge-web constellation rendered in the background
 * of the Tracker hero card.
 */
export function KnowledgeWebMotif() {
    return (
        <View style={styles.motifWrap} pointerEvents="none">
            <View style={[styles.motifEdge, { width: 88, top: 26, right: 36, transform: [{ rotate: "-22deg" }] }]} />
            <View style={[styles.motifEdge, { width: 72, top: 58, right: 18, transform: [{ rotate: "32deg" }] }]} />
            <View style={[styles.motifEdge, { width: 64, top: 68, right: 78, transform: [{ rotate: "-8deg" }] }]} />
            <View style={[styles.motifNode, styles.motifNodePrimary, { top: 14, right: 30 }]} />
            <View style={[styles.motifNode, { top: 44, right: 108 }]} />
            <View style={[styles.motifNode, styles.motifNodeCovered, { top: 76, right: 20 }]} />
            <View style={[styles.motifNode, { top: 82, right: 136 }]} />
        </View>
    );
}

/**
 * Animated radial dial built with 24 orbital segments so it renders identically
 * on iOS, Android, and Web without extra native SVG modules.
 */
export function CoverageOrbitDial({
    percent,
    covered,
    total,
    size = 116,
}: {
    percent: number;
    covered: number;
    total: number;
    size?: number;
}) {
    const clamped = Math.max(0, Math.min(100, percent));

    const segments = 24;
    const filledSegments = Math.round((clamped / 100) * segments);
    const radius = size / 2 - 10;
    const center = size / 2;

    return (
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            {/* Outer subtle halo */}
            <View
                style={{
                    position: "absolute",
                    width: size - 6,
                    height: size - 6,
                    borderRadius: (size - 6) / 2,
                    borderWidth: 1,
                    borderColor: TRACKER_PALETTE.purpleBorder,
                    backgroundColor: TRACKER_PALETTE.purpleGlow,
                }}
            />

            {/* Orbital tick nodes */}
            {Array.from({ length: segments }).map((_, idx) => {
                const angleRad = ((idx / segments) * 360 - 90) * (Math.PI / 180);
                const x = center + radius * Math.cos(angleRad) - 3.5;
                const y = center + radius * Math.sin(angleRad) - 3.5;
                const active = idx < filledSegments;
                const complete = clamped >= 100;
                return (
                    <View
                        key={idx}
                        style={{
                            position: "absolute",
                            left: x,
                            top: y,
                            width: 7,
                            height: 7,
                            borderRadius: 3.5,
                            backgroundColor: active
                                ? complete
                                    ? TRACKER_PALETTE.emerald
                                    : TRACKER_PALETTE.purple
                                : TRACKER_PALETTE.borderStrong,
                            opacity: active ? 1 : 0.45,
                        }}
                    />
                );
            })}

            {/* Center readout */}
            <View style={{ alignItems: "center", justifyContent: "center" }}>
                <Text style={styles.dialPct}>{`${Math.round(clamped)}%`}</Text>
                <Text style={styles.dialSub}>{`${covered}/${total}`}</Text>
                <Text style={styles.dialCaption}>TOPICS</Text>
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
    status: TrackerChapterStatus;
    isLast: boolean;
}) {
    const color =
        status === "COVERED"
            ? TRACKER_PALETTE.emerald
            : status === "PARTIAL"
              ? TRACKER_PALETTE.amber
              : TRACKER_PALETTE.borderStrong;

    return (
        <View style={styles.nodeColumn}>
            <View
                style={[
                    styles.chapterNodeOuter,
                    {
                        borderColor: color,
                        backgroundColor:
                            status === "COVERED"
                                ? TRACKER_PALETTE.emeraldSoft
                                : status === "PARTIAL"
                                  ? TRACKER_PALETTE.amberSoft
                                  : TRACKER_PALETTE.surface,
                    },
                ]}
            >
                {status !== "UNCOVERED" && status !== "EMPTY" && (
                    <View
                        style={[
                            styles.chapterNodeInner,
                            { backgroundColor: color },
                        ]}
                    />
                )}
            </View>
            {!isLast && <View style={styles.nodeSpine} />}
        </View>
    );
}

/**
 * Animated horizontal bar for chapter-level or overall completion.
 */
export function AnimatedCoverageBar({
    percent,
    status,
    height = 6,
}: {
    percent: number;
    status?: TrackerChapterStatus;
    height?: number;
}) {
    const clamped = Math.max(0, Math.min(100, percent));
    const [widthAnim] = useState(() => new Animated.Value(clamped));

    useEffect(() => {
        Animated.timing(widthAnim, {
            toValue: clamped,
            duration: 380,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        }).start();
    }, [clamped, widthAnim]);

    const barColor =
        status === "COVERED" || clamped >= 100
            ? TRACKER_PALETTE.emerald
            : status === "PARTIAL"
              ? TRACKER_PALETTE.purple
              : TRACKER_PALETTE.muted;

    return (
        <View style={[styles.barTrack, { height, borderRadius: height / 2 }]}>
            <Animated.View
                style={{
                    height: "100%",
                    borderRadius: height / 2,
                    backgroundColor: barColor,
                    width: widthAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ["0%", "100%"],
                    }),
                }}
            />
        </View>
    );
}

/**
 * Trailing 6-week activity visualization derived strictly from dated events.
 */
export function WeeklyActivityCard({
    buckets,
    asOf,
}: {
    buckets: WeeklyActivityBucket[];
    asOf: string | null;
}) {
    const maxTopics = Math.max(
        1,
        ...buckets.map((b) => Math.max(b.uniqueTopicsTouched, b.newlyCoveredTopics)),
    );
    const totalSessions = buckets.reduce((acc, b) => acc + b.eventCount, 0);
    const totalNewlyCovered = buckets.reduce(
        (acc, b) => acc + b.newlyCoveredTopics,
        0,
    );

    return (
        <View style={styles.weeklyCard}>
            <View style={styles.weeklyHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.weeklyEyebrow}>
                        6-WEEK COVERAGE PACE {asOf ? `(UP TO ${asOf})` : ""}
                    </Text>
                    <Text style={styles.weeklyTitle}>Weekly Syllabus Activity</Text>
                </View>
                <View style={styles.weeklyCounters}>
                    <View style={styles.weeklyCounterPill}>
                        <Text style={styles.weeklyCounterVal}>{totalSessions}</Text>
                        <Text style={styles.weeklyCounterLbl}>sessions</Text>
                    </View>
                    <View style={[styles.weeklyCounterPill, { borderColor: TRACKER_PALETTE.purpleBorder }]}>
                        <Text style={[styles.weeklyCounterVal, { color: TRACKER_PALETTE.purple }]}>
                            {totalNewlyCovered}
                        </Text>
                        <Text style={styles.weeklyCounterLbl}>new topics</Text>
                    </View>
                </View>
            </View>

            <View style={styles.chartArea}>
                {buckets.map((b) => {
                    const touchedHeight = Math.round(
                        (b.uniqueTopicsTouched / maxTopics) * 68,
                    );
                    const newHeight = Math.round(
                        (b.newlyCoveredTopics / maxTopics) * 68,
                    );
                    return (
                        <View key={b.weekStart} style={styles.weekCol}>
                            <Text style={styles.weekCountTop}>
                                {b.uniqueTopicsTouched > 0
                                    ? `${b.newlyCoveredTopics}${
                                          b.uniqueTopicsTouched > b.newlyCoveredTopics
                                              ? `+${b.uniqueTopicsTouched - b.newlyCoveredTopics}r`
                                              : ""
                                      }`
                                    : "0"}
                            </Text>
                            <View style={styles.weekBarTrack}>
                                {/* Total unique topics touched (includes revisits) */}
                                {b.uniqueTopicsTouched > 0 && (
                                    <View
                                        style={[
                                            styles.weekBarTouched,
                                            { height: Math.max(6, touchedHeight) },
                                        ]}
                                    />
                                )}
                                {/* Newly covered unique topics */}
                                {b.newlyCoveredTopics > 0 && (
                                    <View
                                        style={[
                                            styles.weekBarNew,
                                            { height: Math.max(6, newHeight) },
                                        ]}
                                    />
                                )}
                            </View>
                            <Text style={styles.weekLabel}>{b.label}</Text>
                            <Text style={styles.weekSessions}>
                                {b.eventCount === 1
                                    ? "1 cls"
                                    : `${b.eventCount} cls`}
                            </Text>
                        </View>
                    );
                })}
            </View>

            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: TRACKER_PALETTE.purple }]} />
                    <Text style={styles.legendText}>First-time covered topics</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: TRACKER_PALETTE.amber }]} />
                    <Text style={styles.legendText}>+r = Revisited topics</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    motifWrap: {
        position: "absolute",
        top: 0,
        right: 0,
        width: 180,
        height: 110,
        overflow: "hidden",
    },
    motifEdge: {
        position: "absolute",
        height: 1,
        backgroundColor: TRACKER_PALETTE.purpleGlow,
    },
    motifNode: {
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: TRACKER_PALETTE.border,
        borderWidth: 1.5,
        borderColor: TRACKER_PALETTE.borderStrong,
    },
    motifNodePrimary: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: TRACKER_PALETTE.purpleGlow,
        borderColor: TRACKER_PALETTE.purple,
    },
    motifNodeCovered: {
        backgroundColor: TRACKER_PALETTE.emeraldSoft,
        borderColor: TRACKER_PALETTE.emerald,
    },
    dialPct: {
        color: TRACKER_PALETTE.text,
        fontSize: 22,
        fontWeight: "800",
        letterSpacing: -0.5,
    },
    dialSub: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 11,
        fontWeight: "600",
        marginTop: 1,
    },
    dialCaption: {
        color: TRACKER_PALETTE.muted,
        fontSize: 8,
        fontWeight: "700",
        letterSpacing: 1,
        marginTop: 1,
    },
    nodeColumn: {
        width: 22,
        alignItems: "center",
    },
    chapterNodeOuter: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    chapterNodeInner: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    nodeSpine: {
        flex: 1,
        width: 1.5,
        backgroundColor: TRACKER_PALETTE.border,
        marginTop: 4,
        minHeight: 16,
    },
    barTrack: {
        width: "100%",
        backgroundColor: TRACKER_PALETTE.surfaceMuted,
        overflow: "hidden",
    },
    weeklyCard: {
        backgroundColor: TRACKER_PALETTE.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        padding: 18,
        gap: 14,
    },
    weeklyHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
    },
    weeklyEyebrow: {
        color: TRACKER_PALETTE.muted,
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.8,
    },
    weeklyTitle: {
        color: TRACKER_PALETTE.text,
        fontSize: 15,
        fontWeight: "700",
        marginTop: 2,
    },
    weeklyCounters: {
        flexDirection: "row",
        gap: 8,
    },
    weeklyCounterPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: TRACKER_PALETTE.border,
        backgroundColor: TRACKER_PALETTE.surfaceElevated,
        alignItems: "center",
    },
    weeklyCounterVal: {
        color: TRACKER_PALETTE.text,
        fontSize: 13,
        fontWeight: "800",
    },
    weeklyCounterLbl: {
        color: TRACKER_PALETTE.muted,
        fontSize: 9,
        fontWeight: "600",
    },
    chartArea: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        paddingTop: 8,
        gap: 6,
    },
    weekCol: {
        flex: 1,
        alignItems: "center",
        gap: 4,
    },
    weekCountTop: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 10,
        fontWeight: "700",
    },
    weekBarTrack: {
        width: "100%",
        maxWidth: 28,
        height: 70,
        borderRadius: 6,
        backgroundColor: TRACKER_PALETTE.surfaceMuted,
        justifyContent: "flex-end",
        overflow: "hidden",
    },
    weekBarTouched: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: TRACKER_PALETTE.amber,
        opacity: 0.55,
        borderRadius: 6,
    },
    weekBarNew: {
        width: "100%",
        backgroundColor: TRACKER_PALETTE.purple,
        borderRadius: 6,
    },
    weekLabel: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 10,
        fontWeight: "600",
    },
    weekSessions: {
        color: TRACKER_PALETTE.muted,
        fontSize: 9,
    },
    legendRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 14,
        borderTopWidth: 1,
        borderTopColor: TRACKER_PALETTE.border,
        paddingTop: 10,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: TRACKER_PALETTE.textSecondary,
        fontSize: 11,
    },
});
