"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
  Search,
  Grid,
  List,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useContent } from "@/hooks/use-content";

interface Asset {
  id: string;
  name: string;
  description: string | null;
  asset_type: "upload" | "report" | "export" | "generated" | "scraped";
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  source_agent: string | null;
  tags: string[];
  created_at: string;
}

const MIME_TYPE_ICONS: Record<string, typeof FileText> = {
  "application/pdf": FileText,
  "image/jpeg": Image,
  "image/png": Image,
  "image/webp": Image,
  "text/csv": FileSpreadsheet,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    FileSpreadsheet,
};

export default function LibraryPage() {
  const { content } = useContent();
  const t = content.platform?.library || {};
  const filters = t.filters || {};
  const assetTypes = t.assetTypes || {};
  const emptyState = t.emptyState || {};
  const pagination = t.pagination || {};

  const ASSET_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    upload: {
      label: assetTypes.upload || "Upload",
      color: "bg-blue-100 text-blue-800",
    },
    report: {
      label: assetTypes.report || "Report",
      color: "bg-green-100 text-green-800",
    },
    export: {
      label: assetTypes.export || "Export",
      color: "bg-purple-100 text-purple-800",
    },
    generated: {
      label: assetTypes.generated || "Generated",
      color: "bg-orange-100 text-orange-800",
    },
    scraped: {
      label: assetTypes.scraped || "Scraped",
      color: "bg-pink-100 text-pink-800",
    },
  };

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("");
  const [paginationState, setPaginationState] = useState({
    total: 0,
    hasMore: false,
  });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (assetTypeFilter) params.set("asset_type", assetTypeFilter);

      const res = await fetch(`/api/library?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
        setPaginationState(data.pagination || { total: 0, hasMore: false });
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  }, [search, assetTypeFilter]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleDelete = async (assetId: string) => {
    if (
      !confirm(t.deleteConfirm || "Are you sure you want to delete this asset?")
    )
      return;

    try {
      const res = await fetch("/api/library", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });

      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
      }
    } catch (error) {
      console.error("Failed to delete asset:", error);
    }
  };

  const handleDownload = async (asset: Asset) => {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("uploads")
      .createSignedUrl(asset.storage_path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string | null) => {
    const Icon = (mimeType && MIME_TYPE_ICONS[mimeType]) || File;
    return <Icon className="w-8 h-8 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t.title || "Asset Library"}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t.description ||
              "All your uploaded files, generated reports, and scraped data in one place."}
          </p>
        </div>
        <Button
          onClick={fetchAssets}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {t.refresh || "Refresh"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t.searchPlaceholder || "Search assets..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <select
          value={assetTypeFilter}
          onChange={(e) => setAssetTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800"
        >
          <option value="">{filters.allTypes || "All Types"}</option>
          <option value="upload">{filters.uploads || "Uploads"}</option>
          <option value="report">{filters.reports || "Reports"}</option>
          <option value="export">{filters.exports || "Exports"}</option>
          <option value="generated">{filters.generated || "Generated"}</option>
          <option value="scraped">{filters.scraped || "Scraped"}</option>
        </select>

        <div className="flex items-center gap-1 border rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded ${viewMode === "grid" ? "bg-gray-100 dark:bg-gray-700" : ""}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded ${viewMode === "list" ? "bg-gray-100 dark:bg-gray-700" : ""}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        <Card className="p-12 text-center">
          <File className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {emptyState.title || "No assets yet"}
          </h3>
          <p className="text-sm text-gray-500">
            {emptyState.description ||
              "Upload files or run agents to populate your library."}
          </p>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <Card
              key={asset.id}
              className="p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                {getFileIcon(asset.mime_type)}
                <Badge
                  className={ASSET_TYPE_LABELS[asset.asset_type]?.color || ""}
                >
                  {ASSET_TYPE_LABELS[asset.asset_type]?.label ||
                    asset.asset_type}
                </Badge>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white truncate mb-1">
                {asset.name}
              </h4>
              <p className="text-xs text-gray-500 mb-3">
                {formatFileSize(asset.size_bytes)} •{" "}
                {new Date(asset.created_at).toLocaleDateString()}
              </p>
              {asset.source_agent && (
                <p className="text-xs text-gray-400 mb-3">
                  {t.sourceAgent || "From"}:{" "}
                  <span className="capitalize">{asset.source_agent}</span>{" "}
                  {t.agentSuffix || "agent"}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => handleDownload(asset)}
                >
                  <Download className="w-3 h-3" />
                  {t.download || "Download"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(asset.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="divide-y">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-4">
                {getFileIcon(asset.mime_type)}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {asset.name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(asset.size_bytes)} •{" "}
                    {new Date(asset.created_at).toLocaleDateString()}
                    {asset.source_agent &&
                      ` • ${t.sourceAgent || "From"} ${asset.source_agent} ${t.agentSuffix || "agent"}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  className={ASSET_TYPE_LABELS[asset.asset_type]?.color || ""}
                >
                  {ASSET_TYPE_LABELS[asset.asset_type]?.label ||
                    asset.asset_type}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(asset)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500"
                  onClick={() => handleDelete(asset.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Pagination info */}
      {!loading && assets.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          {pagination.showing || "Showing"} {assets.length}{" "}
          {pagination.of || "of"} {paginationState.total}{" "}
          {pagination.assets || "assets"}
        </p>
      )}
    </div>
  );
}
