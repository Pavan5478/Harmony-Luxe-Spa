// src/components/invoice/DeleteButton.tsx
"use client";

export default function DeleteButton({ idOrNo }: { idOrNo: string }) {
  async function onDelete() {
    if (
      !confirm(
        "Delete (void) this invoice? Data in Google Sheet will NOT be removed."
      )
    )
      return;

    const res = await fetch(`/api/bills/${encodeURIComponent(idOrNo)}`, {
      method: "DELETE",
    });

    if (res.ok) {
      location.reload();
    } else {
      alert("Failed to delete");
    }
  }

  return (
    <button
      type="button"
      className="inline-flex items-center rounded-full border border-danger/40 bg-danger/5 px-2.5 py-1 text-[11px] font-medium text-danger hover:bg-danger/10"
      onClick={onDelete}
    >
      Delete
    </button>
  );
}