# @aether/ui

Shared React presentation used by Admin, Builder and the public website. This is a library, not a fourth frontend.

`src/index.ts` exports `PremiumButton` and its props. Each app's `components/premium-button` wrapper sets its own `themeContext`; website, Builder and Admin styles stay separate while the reusable button behavior has one source.

Keep the public export and component props stable when editing. User/account/project/content business logic belongs in the apps and API, not in this package. React is a peer dependency so the consuming app provides its React instance. No separate service or deployment is required.
