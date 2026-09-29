import { groupAnalysesByRepository } from "../../../src/backend/service/analysis/analysis";

const commitHash = "eadcef755950ff580ef27904dfa56f1437acfd46";

function repo(name: string) {
    return {
        scope: "acme/projects",
        name,
        url: `https://gitlab.com/acme/projects/${name}.git`,
        branch: "main",
        // Every repository was created from the same template, so they all share the
        // template's root commit.
        initialCommitHash: commitHash,
    };
}

describe("groupAnalysesByRepository", () => {
    it("keeps template-derived repositories apart despite a shared initial commit", () => {
        const groups = groupAnalysesByRepository([
            { _id: "a1", packageNames: ["@acme/payout-ui"], repository: repo("payout-ui") },
            { _id: "a2", packageNames: ["@acme/voucher-ui"], repository: repo("voucher-ui") },
            { _id: "a3", packageNames: ["@acme/search-ui"], repository: repo("search-ui") },
        ]);

        expect(groups).toEqual([
            { latestAnalysisId: "a1", latestPackageNames: ["@acme/payout-ui"] },
            { latestAnalysisId: "a2", latestPackageNames: ["@acme/voucher-ui"] },
            { latestAnalysisId: "a3", latestPackageNames: ["@acme/search-ui"] },
        ]);
    });

    it("keeps only the latest analysis of a repository", () => {
        const groups = groupAnalysesByRepository([
            { _id: "old", packageNames: ["@acme/payout-ui"], repository: repo("payout-ui") },
            { _id: "new", packageNames: ["@acme/payout-ui", "@acme/pico"], repository: repo("payout-ui") },
        ]);

        expect(groups).toEqual([
            { latestAnalysisId: "new", latestPackageNames: ["@acme/payout-ui", "@acme/pico"] },
        ]);
    });

    it("matches a repository whose url changed but scope/name did not", () => {
        const groups = groupAnalysesByRepository([
            { _id: "a1", packageNames: ["@acme/payout-ui"], repository: { scope: "acme/projects", name: "payout-ui", url: "https://gitlab.com/acme/projects/payout-ui.git" } },
            { _id: "a2", packageNames: ["@acme/payout-ui"], repository: { scope: "acme/projects", name: "payout-ui", url: "https://github.com/acme/payout-ui.git" } },
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].latestAnalysisId).toBe("a2");
    });

    it("falls back to the initial commit hash when no unique id is reported", () => {
        const groups = groupAnalysesByRepository([
            { _id: "a1", packageNames: ["@acme/payout-ui"], repository: { branch: "main", initialCommitHash: "abc123" } },
            { _id: "a2", packageNames: ["@acme/payout-ui"], repository: { branch: "main", initialCommitHash: "abc123" } },
            { _id: "a3", packageNames: ["@acme/other-ui"], repository: { branch: "main", initialCommitHash: "def456" } },
        ]);

        expect(groups).toEqual([
            { latestAnalysisId: "a2", latestPackageNames: ["@acme/payout-ui"] },
            { latestAnalysisId: "a3", latestPackageNames: ["@acme/other-ui"] },
        ]);
    });

    it("treats analyses without repository metadata as separate repositories", () => {
        const groups = groupAnalysesByRepository([
            { _id: "a1", packageNames: ["@acme/payout-ui"] },
            { _id: "a2", packageNames: ["@acme/voucher-ui"] },
        ]);

        expect(groups).toHaveLength(2);
    });
});
