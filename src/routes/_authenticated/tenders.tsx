import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tenders")({
  head: () => ({
    meta: [
      { title: "Tenders | Jasmiq Procurement AI" },
      {
        name: "description",
        content:
          "Upload, store, preview and download your organization's tender and RFP documents.",
      },
      { property: "og:title", content: "Tenders | Jasmiq Procurement AI" },
      {
        property: "og:description",
        content:
          "Upload, store, preview and download your organization's tender and RFP documents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TendersLayout,
});

function TendersLayout() {
  return <Outlet />;
}
