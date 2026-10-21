# Minimal workspace validation

Version 1.0.0 implementation checks. The same article was checked in Write,
Review and Read at these viewport widths (height 844px):

| Window | Article width | Left edge | Review inspector |
| --- | --- | --- | --- |
| 390px | 350px | 20px | Bottom |
| 768px | 672px | 48px | Bottom |
| 1180px | 672px | 254px | Bottom |
| 1440px | 672px | 384px | Right, 288px |

All three modes had matching article geometry and no horizontal overflow.
A selected word near offset 9550 in a long wrapped paragraph was visible above
the 390px bottom inspector after source and page scrolling. Reading preserved
list start 3, image labels and source headings; Outline navigation stayed in Read.
No image elements or remote resource fetching were used by the preview.

58 JavaScript tests passed, including 450 findings, incremental loading, stale
findings, individual and legacy dismissal recovery, saved working positions,
private-session discard, save failures, migration and backup conflicts. Five
Rust filesystem tests passed offline. Portable and desktop frontend builds passed.

An isolated ad-hoc-signed Mac debug app launched with the new interface.
Individual Apply and native Cmd+Z were exercised, then quit/reopen restored
the article text and saved state. Browser reload restored Read, and Find
returned focus to the reading preview after Escape. These checks used
synthetic documents and do not establish clean-machine release acceptance.

Screenshots: [Write](images/blunted-minimal-write.png),
[Review](images/blunted-minimal-review.png), [Read](images/blunted-minimal-read.png).

Installed Windows and release Mac offline acceptance, assistive technology,
200 percent zoom, representative typing latency and five independent writer
sessions remain release gates. See [article workflow](article-workspace.md).
