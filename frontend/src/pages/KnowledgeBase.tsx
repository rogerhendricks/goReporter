import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useBreadcrumbs } from "@/components/ui/breadcrumb-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface KnowledgeBaseArticle {
  id: string;
  title: string;
  path: string;
}

interface KnowledgeBaseSection {
  id: string;
  title: string;
  articles: KnowledgeBaseArticle[];
}

interface KnowledgeBaseManifest {
  sections: KnowledgeBaseSection[];
}

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const { sectionId, articleId } = useParams();
  const { setItems } = useBreadcrumbs();

  const [manifest, setManifest] = useState<KnowledgeBaseManifest | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(true);

  const [markdown, setMarkdown] = useState<string>("");
  const [markdownError, setMarkdownError] = useState<string | null>(null);
  const [loadingMarkdown, setLoadingMarkdown] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadManifest() {
      setLoadingManifest(true);
      setManifestError(null);

      try {
        const res = await fetch("/knowledge-base/index.json", {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(
            `Failed to load knowledge base index (HTTP ${res.status})`,
          );
        }
        const data = (await res.json()) as KnowledgeBaseManifest;

        if (!cancelled) {
          setManifest(data);
        }
      } catch (err) {
        if (!cancelled) {
          setManifestError(
            err instanceof Error
              ? err.message
              : "Failed to load knowledge base index",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingManifest(false);
        }
      }
    }

    loadManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedSelection = useMemo(() => {
    if (!manifest) return null;

    const section =
      manifest.sections.find((s) => s.id === sectionId) ?? manifest.sections[0];
    if (!section) return null;

    const article =
      section.articles.find((a) => a.id === articleId) ?? section.articles[0];
    if (!article) return null;

    return { section, article };
  }, [manifest, sectionId, articleId]);

  useEffect(() => {
    if (!manifest || !resolvedSelection) return;

    const urlSectionId = sectionId ?? "";
    const urlArticleId = articleId ?? "";

    if (
      urlSectionId !== resolvedSelection.section.id ||
      urlArticleId !== resolvedSelection.article.id
    ) {
      navigate(
        `/knowledge-base/${resolvedSelection.section.id}/${resolvedSelection.article.id}`,
        { replace: true },
      );
    }
  }, [manifest, resolvedSelection, sectionId, articleId, navigate]);

  useEffect(() => {
    let cancelled = false;

    async function loadMarkdown(path: string) {
      setLoadingMarkdown(true);
      setMarkdownError(null);

      try {
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to load article (HTTP ${res.status})`);
        }
        const text = await res.text();

        if (!cancelled) {
          setMarkdown(text);
        }
      } catch (err) {
        if (!cancelled) {
          setMarkdown("");
          setMarkdownError(
            err instanceof Error ? err.message : "Failed to load article",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMarkdown(false);
        }
      }
    }

    if (resolvedSelection?.article?.path) {
      loadMarkdown(resolvedSelection.article.path);
    }

    return () => {
      cancelled = true;
    };
  }, [resolvedSelection?.article?.path]);

  useEffect(() => {
    const items: Array<{ label: string; href?: string; current?: boolean }> = [
      { label: "Home", href: "/" },
      { label: "Knowledge Base", href: "/knowledge-base" },
    ];

    if (resolvedSelection?.section) {
      items.push({
        label: resolvedSelection.section.title,
        href: `/knowledge-base/${resolvedSelection.section.id}`,
      });
    }

    if (resolvedSelection?.article) {
      items.push({
        label: resolvedSelection.article.title,
        current: true,
      });
    } else {
      items[items.length - 1].current = true;
    }

    setItems(items);
  }, [resolvedSelection, setItems]);

  return (
    <div className="container mx-auto">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Knowledge Base</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[70vh]">
              <div className="p-4">
                {loadingManifest ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : manifestError ? (
                  <div className="text-sm text-destructive">
                    {manifestError}
                  </div>
                ) : !manifest || manifest.sections.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No articles found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {manifest.sections.map((section) => (
                      <div key={section.id} className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {section.title}
                        </div>
                        <div className="space-y-1">
                          {section.articles.map((article) => {
                            const isActive =
                              resolvedSelection?.section.id === section.id &&
                              resolvedSelection?.article.id === article.id;

                            return (
                              <Button
                                key={article.id}
                                asChild
                                variant="ghost"
                                className={cn(
                                  "w-full justify-start",
                                  isActive && "bg-accent",
                                )}
                              >
                                <Link
                                  to={`/knowledge-base/${section.id}/${article.id}`}
                                >
                                  {article.title}
                                </Link>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {resolvedSelection?.article.title ?? "Article"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMarkdown ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : markdownError ? (
              <div className="text-sm text-destructive">{markdownError}</div>
            ) : !markdown.trim() ? (
              <div className="text-sm text-muted-foreground">No content.</div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  components={{
                    h1: (props) => (
                      <h1
                        className="scroll-m-20 text-3xl font-bold tracking-tight"
                        {...props}
                      />
                    ),
                    h2: (props) => (
                      <h2
                        className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight"
                        {...props}
                      />
                    ),
                    h3: (props) => (
                      <h3
                        className="scroll-m-20 text-xl font-semibold tracking-tight"
                        {...props}
                      />
                    ),
                    p: (props) => <p className="leading-7" {...props} />,
                    ul: (props) => (
                      <ul className="my-4 ml-6 list-disc" {...props} />
                    ),
                    ol: (props) => (
                      <ol className="my-4 ml-6 list-decimal" {...props} />
                    ),
                    li: (props) => <li className="mt-2" {...props} />,
                    hr: () => <Separator className="my-6" />,
                    a: ({ href, ...props }) => (
                      <a
                        href={href}
                        target={href?.startsWith("http") ? "_blank" : undefined}
                        rel={
                          href?.startsWith("http") ? "noreferrer" : undefined
                        }
                        className="font-medium underline underline-offset-4"
                        {...props}
                      />
                    ),
                    code: (props) => (
                      <code
                        className="rounded bg-muted px-1 py-0.5 font-mono text-[0.875em]"
                        {...props}
                      />
                    ),
                    pre: (props) => (
                      <pre
                        className="my-4 overflow-x-auto rounded-lg bg-muted p-4"
                        {...props}
                      />
                    ),
                  }}
                >
                  {markdown}
                </ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
