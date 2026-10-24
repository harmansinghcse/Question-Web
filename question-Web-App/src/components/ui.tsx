import { useMemo, useState, type ReactNode } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "../providers/ThemeProvider";
import type { Question, QuestionType } from "../services/api";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Question type styling ───────────────────────────────────────────────────

export const TYPE_META: Record<
    QuestionType,
    { label: string; short: string; color: string; icon: IconName }
> = {
    MCQ: {
        label: "Multiple choice",
        short: "MCQ",
        color: "#6842E8",
        icon: "radio-button-on-outline",
    },
    FILLUPS: {
        label: "Fill in the blanks",
        short: "Fill-ups",
        color: "#D6409F",
        icon: "create-outline",
    },
    SUBJECTIVE: {
        label: "Subjective",
        short: "Subjective",
        color: "#2BA471",
        icon: "document-text-outline",
    },
    "TRUE/FALSE": {
        label: "True / False",
        short: "True / False",
        color: "#E08A00",
        icon: "checkmark-done-outline",
    },
};

// ─── Badge ───────────────────────────────────────────────────────────────────

export function Badge({
    label,
    color,
    icon,
}: {
    label: string;
    color?: string;
    icon?: IconName;
}) {
    const { theme } = useAppTheme();
    const fg = color ?? theme.muted;
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: color ? color + "1A" : theme.surfaceAlt,
            }}
        >
            {icon ? <Ionicons name={icon} size={11} color={fg} /> : null}
            <Text
                style={{ color: fg, fontSize: 11, fontWeight: "700" }}
                numberOfLines={1}
            >
                {label}
            </Text>
        </View>
    );
}

// ─── Pill (filter chip) ──────────────────────────────────────────────────────

export function Pill({
    label,
    active,
    onPress,
    color,
    icon,
}: {
    label: string;
    active?: boolean;
    onPress: () => void;
    color?: string;
    icon?: IconName;
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
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? activeBg : theme.border,
                backgroundColor: active ? activeBg : theme.surface,
                opacity: pressed ? 0.85 : 1,
            })}
        >
            {icon ? (
                <Ionicons
                    name={icon}
                    size={14}
                    color={active ? "#FFFFFF" : theme.muted}
                />
            ) : null}
            <Text
                numberOfLines={1}
                style={{
                    color: active ? "#FFFFFF" : theme.text,
                    fontSize: 12,
                    fontWeight: "700",
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

// ─── Section header ──────────────────────────────────────────────────────────

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
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginBottom: 12,
                gap: 12,
            }}
        >
            <View style={{ flex: 1 }}>
                <Text
                    style={{
                        color: theme.text,
                        fontSize: 17,
                        fontWeight: "800",
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
                >
                    <Text
                        style={{
                            color: theme.accent,
                            fontSize: 13,
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

// ─── Loading / error / empty ─────────────────────────────────────────────────

export function LoadingBlock({ label }: { label: string }) {
    const { theme } = useAppTheme();
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                paddingVertical: 28,
            }}
        >
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={{ color: theme.muted, fontSize: 13 }}>{label}</Text>
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
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.danger,
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
                        numberOfLines={2}
                        style={{
                            color: theme.muted,
                            fontSize: 12,
                            marginTop: 2,
                        }}
                    >
                        {message}
                    </Text>
                ) : null}
            </View>
            <Pressable
                onPress={onRetry}
                accessibilityRole="button"
                style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: theme.accent,
                }}
            >
                <Text
                    style={{
                        color: "#FFFFFF",
                        fontSize: 12,
                        fontWeight: "700",
                    }}
                >
                    Try again
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
                padding: 28,
                borderRadius: 18,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: theme.border,
                backgroundColor: theme.surface,
            }}
        >
            <View
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.surfaceAlt,
                    marginBottom: 12,
                }}
            >
                <Ionicons name={icon} size={22} color={theme.accent} />
            </View>
            <Text
                style={{ color: theme.text, fontSize: 15, fontWeight: "800" }}
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
                    maxWidth: 360,
                }}
            >
                {text}
            </Text>
            {actionLabel && onAction ? (
                <Pressable
                    onPress={onAction}
                    accessibilityRole="button"
                    style={{
                        marginTop: 16,
                        paddingHorizontal: 18,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: theme.accent,
                    }}
                >
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 13,
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

// ─── Markdown ────────────────────────────────────────────────────────────────

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
            strong: { fontWeight: "800" as const },
            em: { fontStyle: "italic" as const },
            link: {
                color: theme.accent,
                textDecorationLine: "underline" as const,
            },
            bullet_list: { marginBottom: 8 },
            ordered_list: { marginBottom: 8 },
            list_item: { marginBottom: 3 },
            code_inline: {
                fontFamily: MONO,
                fontSize: 13,
                color: theme.accent,
                backgroundColor: theme.surfaceAlt,
                borderRadius: 4,
                paddingHorizontal: 4,
                borderWidth: 0,
            },
            code_block: {
                fontFamily: MONO,
                fontSize: 13,
                lineHeight: 19,
                color: theme.text,
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 10,
                padding: 12,
                marginBottom: 8,
            },
            fence: {
                fontFamily: MONO,
                fontSize: 13,
                lineHeight: 19,
                color: theme.text,
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 10,
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

    // Normalise Windows line endings so lists and code fences parse correctly.
    return (
        <Markdown style={styles}>{children.replace(/\r\n/g, "\n")}</Markdown>
    );
}

// ─── Question card ───────────────────────────────────────────────────────────

const MAX_TOPIC_BADGES = 3;
const COLLAPSED_HEIGHT = 150;

export function QuestionCard({ question }: { question: Question }) {
    const { theme } = useAppTheme();
    const [expanded, setExpanded] = useState(false);
    const meta = TYPE_META[question.quesType] ?? TYPE_META.SUBJECTIVE;
    const topics = question.topics ?? [];
    const extra = topics.length - MAX_TOPIC_BADGES;

    // Long questions (long text, many lines, code) are clamped until expanded.
    const isLong =
        question.quesText.length > 280 ||
        question.quesText.split("\n").length > 7;

    return (
        <View
            style={{
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                borderLeftWidth: 4,
                borderLeftColor: meta.color,
                borderRadius: 14,
                padding: 14,
                gap: 10,
            }}
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
                            fontSize: 13,
                            fontWeight: "700",
                        }}
                    >
                        {expanded ? "Show less" : "Show more"}
                    </Text>
                </Pressable>
            )}

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <Badge label={meta.short} color={meta.color} icon={meta.icon} />
                {topics.slice(0, MAX_TOPIC_BADGES).map((t) => (
                    <Badge key={t.topicId} label={t.topicName} />
                ))}
                {extra > 0 ? <Badge label={`+${extra} more`} /> : null}
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
                borderRadius: 18,
                padding: 16,
            }}
        >
            {children}
        </View>
    );
}
