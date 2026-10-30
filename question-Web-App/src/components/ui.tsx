import { useMemo, useState, type ReactNode } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import Markdown from "react-native-markdown-display";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../providers/ThemeProvider";
import type { Question, QuestionType } from "../services/api";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export const TYPE_META: Record<
    QuestionType,
    { label: string; short: string; color: string; icon: IconName }
> = {
    SUBJECTIVE: {
        label: "Subjective",
        short: "Subjective",
        color: "#EF4444",
        icon: "document-text-outline",
    },
    MCQ: {
        label: "Multiple Choice",
        short: "MCQ",
        color: "#3B82F6",
        icon: "list-outline",
    },
    FILLUPS: {
        label: "Fill in the Blanks",
        short: "Fill-ups",
        color: "#F59E0B",
        icon: "create-outline",
    },
    "TRUE/FALSE": {
        label: "True / False",
        short: "True / False",
        color: "#10B981",
        icon: "checkmark-done-outline",
    },
};

export function Badge({
    label,
    color,
    icon,
    onPress,
}: {
    label: string;
    color?: string;
    icon?: IconName;
    onPress?: () => void;
}) {
    const { theme } = useAppTheme();
    const fg = color ?? theme.textSecondary;
    const content = (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: color ? color + "38" : theme.border,
                backgroundColor: color ? color + "14" : theme.surfaceAlt,
            }}
        >
            {icon ? <Ionicons name={icon} size={11} color={fg} /> : null}
            <Text
                style={{ color: fg, fontSize: 11, fontWeight: "600" }}
                numberOfLines={1}
            >
                {label}
            </Text>
        </View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                accessibilityRole="button"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
                {content}
            </Pressable>
        );
    }
    return content;
}

export function Pill({
    label,
    active,
    onPress,
    color,
    icon,
    count,
}: {
    label: string;
    active?: boolean;
    onPress: () => void;
    color?: string;
    icon?: IconName;
    count?: number;
}) {
    const { theme } = useAppTheme();
    const activeBg = color ?? theme.accent;
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: !!active }}
            style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                height: 36,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: active ? activeBg : theme.border,
                backgroundColor: active ? activeBg : theme.surface,
                opacity: pressed ? 0.85 : 1,
            })}
        >
            {icon ? (
                <Ionicons
                    name={icon}
                    size={13}
                    color={active ? "#FFFFFF" : color ?? theme.muted}
                />
            ) : null}
            <Text
                numberOfLines={1}
                style={{
                    color: active ? "#FFFFFF" : theme.textSecondary,
                    fontSize: 12,
                    fontWeight: active ? "700" : "600",
                }}
            >
                {label}
            </Text>
            {count !== undefined ? (
                <View
                    style={{
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        borderRadius: 4,
                        backgroundColor: active
                            ? "rgba(255,255,255,0.2)"
                            : theme.surfaceAlt,
                    }}
                >
                    <Text
                        style={{
                            color: active ? "#FFFFFF" : theme.muted,
                            fontSize: 10,
                            fontWeight: "700",
                        }}
                    >
                        {count}
                    </Text>
                </View>
            ) : null}
        </Pressable>
    );
}

export function SectionHeader({
    title,
    subtitle,
    actionLabel,
    onAction,
}: {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    const { theme } = useAppTheme();
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
                gap: 12,
            }}
        >
            <View style={{ flex: 1 }}>
                <Text
                    style={{
                        color: theme.text,
                        fontSize: 16,
                        fontWeight: "800",
                        letterSpacing: 0.1,
                    }}
                >
                    {title}
                </Text>
                {subtitle ? (
                    <Text
                        style={{
                            color: theme.muted,
                            fontSize: 12,
                            marginTop: 2,
                        }}
                    >
                        {subtitle}
                    </Text>
                ) : null}
            </View>
            {actionLabel && onAction ? (
                <Pressable
                    onPress={onAction}
                    accessibilityRole="button"
                    hitSlop={8}
                    style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        opacity: pressed ? 0.75 : 1,
                    })}
                >
                    <Text
                        style={{
                            color: theme.accent,
                            fontSize: 12,
                            fontWeight: "700",
                        }}
                    >
                        {actionLabel}
                    </Text>
                    <Ionicons
                        name="arrow-forward"
                        size={13}
                        color={theme.accent}
                    />
                </Pressable>
            ) : null}
        </View>
    );
}

export function LoadingBlock({ label }: { label: string }) {
    const { theme } = useAppTheme();
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                paddingVertical: 32,
                backgroundColor: theme.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
            }}
        >
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={{ color: theme.muted, fontSize: 13, fontWeight: "500" }}>
                {label}
            </Text>
        </View>
    );
}

export function ErrorBlock({
    title,
    message,
    onRetry,
}: {
    title: string;
    message?: string;
    onRetry: () => void;
}) {
    const { theme } = useAppTheme();
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.danger + "66",
                backgroundColor: theme.surface,
            }}
        >
            <Ionicons name="alert-circle" size={22} color={theme.danger} />
            <View style={{ flex: 1 }}>
                <Text
                    style={{
                        color: theme.text,
                        fontSize: 13,
                        fontWeight: "700",
                    }}
                >
                    {title}
                </Text>
                {message ? (
                    <Text
                        numberOfLines={3}
                        style={{
                            color: theme.muted,
                            fontSize: 12,
                            marginTop: 2,
                            lineHeight: 17,
                        }}
                    >
                        {message}
                    </Text>
                ) : null}
            </View>
            <Pressable
                onPress={onRetry}
                accessibilityRole="button"
                style={({ pressed }) => ({
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: theme.accent,
                    opacity: pressed ? 0.85 : 1,
                })}
            >
                <Text
                    style={{
                        color: "#FFFFFF",
                        fontSize: 12,
                        fontWeight: "700",
                    }}
                >
                    Retry
                </Text>
            </Pressable>
        </View>
    );
}

export function EmptyBlock({
    icon,
    title,
    text,
    actionLabel,
    onAction,
}: {
    icon: IconName;
    title: string;
    text: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    const { theme } = useAppTheme();
    return (
        <View
            style={{
                alignItems: "center",
                padding: 32,
                borderRadius: 14,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: theme.borderStrong,
                backgroundColor: theme.surface,
            }}
        >
            <View
                style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.accentSoft,
                    borderWidth: 1,
                    borderColor: theme.accent + "33",
                    marginBottom: 12,
                }}
            >
                <Ionicons name={icon} size={22} color={theme.accent} />
            </View>
            <Text
                style={{
                    color: theme.text,
                    fontSize: 15,
                    fontWeight: "700",
                    textAlign: "center",
                }}
            >
                {title}
            </Text>
            <Text
                style={{
                    color: theme.muted,
                    fontSize: 13,
                    lineHeight: 19,
                    textAlign: "center",
                    marginTop: 4,
                    maxWidth: 380,
                }}
            >
                {text}
            </Text>
            {actionLabel && onAction ? (
                <Pressable
                    onPress={onAction}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                        marginTop: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 9,
                        borderRadius: 8,
                        backgroundColor: theme.accent,
                        opacity: pressed ? 0.85 : 1,
                    })}
                >
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 12,
                            fontWeight: "700",
                        }}
                    >
                        {actionLabel}
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );
}

const MONO = Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
});

/** Renders question text as Markdown, styled with the app theme. */
export function MarkdownText({ children }: { children: string }) {
    const { theme } = useAppTheme();
    const styles = useMemo(
        () => ({
            body: { color: theme.text, fontSize: 14, lineHeight: 22 },
            paragraph: { marginTop: 0, marginBottom: 8 },
            heading1: {
                color: theme.text,
                fontSize: 18,
                fontWeight: "800" as const,
                marginTop: 4,
                marginBottom: 8,
            },
            heading2: {
                color: theme.text,
                fontSize: 16,
                fontWeight: "800" as const,
                marginTop: 4,
                marginBottom: 6,
            },
            heading3: {
                color: theme.text,
                fontSize: 15,
                fontWeight: "700" as const,
                marginTop: 2,
                marginBottom: 4,
            },
            strong: { fontWeight: "800" as const, color: theme.text },
            em: { fontStyle: "italic" as const },
            link: {
                color: theme.accent,
                textDecorationLine: "underline" as const,
            },
            bullet_list: { marginBottom: 8 },
            ordered_list: { marginBottom: 8 },
            list_item: { marginBottom: 4 },
            code_inline: {
                fontFamily: MONO,
                fontSize: 12,
                color: theme.accent,
                backgroundColor: theme.surfaceAlt,
                borderRadius: 4,
                paddingHorizontal: 5,
                paddingVertical: 1,
                borderWidth: 0,
            },
            code_block: {
                fontFamily: MONO,
                fontSize: 12,
                lineHeight: 18,
                color: theme.text,
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
            },
            fence: {
                fontFamily: MONO,
                fontSize: 12,
                lineHeight: 18,
                color: theme.text,
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
            },
            blockquote: {
                backgroundColor: theme.surfaceAlt,
                borderLeftColor: theme.accent,
                borderLeftWidth: 3,
                paddingHorizontal: 12,
                paddingVertical: 4,
                marginBottom: 8,
            },
            hr: {
                backgroundColor: theme.border,
                height: 1,
                marginVertical: 10,
            },
            table: {
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 8,
                marginBottom: 8,
            },
            th: { padding: 6, fontWeight: "700" as const },
            td: { padding: 6 },
            tr: {
                borderBottomColor: theme.border,
                borderBottomWidth: 1,
                flexDirection: "row" as const,
            },
        }),
        [theme],
    );

    return (
        <Markdown style={styles}>{children.replace(/\r\n/g, "\n")}</Markdown>
    );
}

/**
 * Inline image gallery for QuestionCard.
 * Displays attached images with clean aspect ratio, horizontal scrolling,
 * and graceful fallback if an image fails to load.
 */
function QuestionCardImages({
    images,
    onPress,
}: {
    images: { imageId: number; imageUrl: string; displayOrder?: number }[];
    onPress: () => void;
}) {
    const { theme } = useAppTheme();
    const [failedIds, setFailedIds] = useState<Set<number>>(new Set());

    const validImages = images.filter(
        (img) => img && typeof img.imageUrl === "string" && img.imageUrl.trim().length > 0,
    );

    if (validImages.length === 0) return null;

    return (
        <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="image-outline" size={13} color={theme.accent} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.muted }}>
                    Attached Images ({validImages.length})
                </Text>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}
            >
                {validImages.map((img, idx) => {
                    const hasFailed = failedIds.has(img.imageId);
                    return (
                        <Pressable
                            key={img.imageId}
                            onPress={onPress}
                            accessibilityRole="button"
                            accessibilityLabel={`View attached image ${idx + 1}`}
                            style={({ pressed }) => ({
                                width: 120,
                                height: 80,
                                borderRadius: 8,
                                overflow: "hidden",
                                borderWidth: 1,
                                borderColor: theme.border,
                                backgroundColor: theme.surfaceAlt,
                                opacity: pressed ? 0.85 : 1,
                            })}
                        >
                            {hasFailed ? (
                                <View
                                    style={{
                                        flex: 1,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 2,
                                        padding: 4,
                                    }}
                                >
                                    <Ionicons
                                        name="alert-circle-outline"
                                        size={18}
                                        color={theme.muted}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 9,
                                            color: theme.muted,
                                            fontWeight: "600",
                                            textAlign: "center",
                                        }}
                                        numberOfLines={1}
                                    >
                                        Unavailable
                                    </Text>
                                </View>
                            ) : (
                                <Image
                                    source={{ uri: img.imageUrl.trim() }}
                                    style={{ width: "100%", height: "100%" }}
                                    contentFit="cover"
                                    transition={200}
                                    onError={() =>
                                        setFailedIds((prev) => new Set(prev).add(img.imageId))
                                    }
                                />
                            )}
                            <View
                                style={{
                                    position: "absolute",
                                    top: 4,
                                    left: 4,
                                    backgroundColor: "rgba(0, 0, 0, 0.65)",
                                    borderRadius: 4,
                                    paddingHorizontal: 5,
                                    paddingVertical: 1,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#FFFFFF",
                                        fontSize: 9,
                                        fontWeight: "700",
                                    }}
                                >
                                    #{idx + 1}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const MAX_TOPIC_BADGES = 3;
const COLLAPSED_HEIGHT = 140;

export function QuestionCard({
    question,
    sourceLabel,
}: {
    question: Question;
    sourceLabel?: string;
}) {
    const router = useRouter();
    const { theme } = useAppTheme();
    const [expanded, setExpanded] = useState(false);

    const meta = TYPE_META[question.quesType] ?? TYPE_META.SUBJECTIVE;
    const topics = question.topics ?? [];
    const extra = topics.length - MAX_TOPIC_BADGES;

    const isLong =
        question.quesText.length > 260 ||
        question.quesText.split("\n").length > 6;

    const openDetail = () => {
        router.push(`/question-bank/${question.quesId}` as never);
    };

    return (
        <View
            style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderLeftWidth: 3,
                borderLeftColor: meta.color,
                borderRadius: 12,
                padding: 16,
                gap: 12,
            }}
        >
            {/* Top metadata row */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                        flex: 1,
                    }}
                >
                    <Badge
                        label={meta.short}
                        color={meta.color}
                        icon={meta.icon}
                    />
                    {sourceLabel ? (
                        <Badge
                            label={sourceLabel}
                            icon="bookmark-outline"
                        />
                    ) : null}
                </View>
                <Pressable
                    onPress={openDetail}
                    accessibilityRole="button"
                    accessibilityLabel={`View Question #${question.quesId}`}
                    hitSlop={8}
                    style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        opacity: pressed ? 0.7 : 1,
                    })}
                >
                    <Text
                        style={{
                            color: theme.muted,
                            fontSize: 11,
                            fontWeight: "700",
                        }}
                    >
                        #{question.quesId}
                    </Text>
                    <Ionicons
                        name="open-outline"
                        size={13}
                        color={theme.muted}
                    />
                </Pressable>
            </View>

            {/* Question body (clickable to open detail) */}
            <Pressable
                onPress={openDetail}
                accessibilityRole="button"
                accessibilityLabel={`Question #${question.quesId}: ${question.quesText.slice(0, 50)}`}
                style={({ pressed }) => [
                    pressed && { opacity: 0.85 },
                ]}
            >
                <View
                    style={
                        isLong && !expanded
                            ? { maxHeight: COLLAPSED_HEIGHT, overflow: "hidden" }
                            : undefined
                    }
                >
                    <MarkdownText>{question.quesText}</MarkdownText>
                </View>
            </Pressable>

            {isLong && (
                <Pressable
                    onPress={() => setExpanded((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={expanded ? "Show less" : "Show more"}
                    hitSlop={8}
                    style={{ alignSelf: "flex-start" }}
                >
                    <Text
                        style={{
                            color: theme.accent,
                            fontSize: 12,
                            fontWeight: "700",
                        }}
                    >
                        {expanded ? "Show less ↑" : "Read full question ↓"}
                    </Text>
                </Pressable>
            )}

            {/* Attached images preview (if any) */}
            {question.images && question.images.length > 0 && (
                <QuestionCardImages
                    images={question.images}
                    onPress={openDetail}
                />
            )}

            {/* Footer with topics + detail action */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    paddingTop: 4,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 6,
                        flex: 1,
                    }}
                >
                    {topics.length === 0 ? (
                        <Text style={{ color: theme.muted, fontSize: 11 }}>
                            General Topic
                        </Text>
                    ) : (
                        topics.slice(0, MAX_TOPIC_BADGES).map((t) => (
                            <Badge key={t.topicId} label={t.topicName} />
                        ))
                    )}
                    {extra > 0 ? <Badge label={`+${extra} more`} /> : null}
                </View>

                <Pressable
                    onPress={openDetail}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: theme.surfaceAlt,
                        borderWidth: 1,
                        borderColor: theme.border,
                        opacity: pressed ? 0.8 : 1,
                    })}
                >
                    <Text
                        style={{
                            color: theme.accent,
                            fontSize: 11,
                            fontWeight: "600",
                        }}
                    >
                        View Question
                    </Text>
                    <Ionicons
                        name="arrow-forward"
                        size={12}
                        color={theme.accent}
                    />
                </Pressable>
            </View>
        </View>
    );
}

export function Card({ children }: { children: ReactNode }) {
    const { theme } = useAppTheme();
    return (
        <View
            style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 14,
                padding: 18,
            }}
        >
            {children}
        </View>
    );
}


export function ProgressBar({
    progress,
    color,
    height = 6,
}: {
    progress: number;
    color?: string;
    height?: number;
}) {
    const { theme } = useAppTheme();
    const pct = progress <= 1 && progress > 0 ? progress * 100 : progress;
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    return (
        <View
            style={{
                height,
                backgroundColor: theme.surfaceAlt,
                borderRadius: height / 2,
                overflow: 'hidden',
                width: '100%',
            }}
        >
            <View
                style={{
                    height: '100%',
                    width: `${clamped}%`,
                    backgroundColor: color ?? theme.accent,
                    borderRadius: height / 2,
                }}
            />
        </View>
    );
}
