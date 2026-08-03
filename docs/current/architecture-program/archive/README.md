# Archive Policy

The archive preserves historical planning detail and completed evidence without loading it into every task.

- `source/` contains byte-for-byte copies of the two original full planning documents supplied before the context split.
- `completed/` contains concise immutable checkpoints for finished tracks.
- Production evidence remains in its canonical repository manifest location; these summaries do not replace it.
- Read archived files only for audit, regression investigation, or a dependency not represented in `contracts/`.
- Do not edit an archived checkpoint to reflect a later deployment. Create a new checkpoint.
