import React from "react";
import AppShell from "../../components/AppShell";
import QuestionBankView from "../../components/QuestionBankView";

export default function QuestionBankScreen() {
    return (
        <AppShell active="questions" hideTopSearch>
            <QuestionBankView />
        </AppShell>
    );
}
