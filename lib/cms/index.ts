/**
 * CMS Integration Library
 * Provides unified interface for publishing content to various CMS platforms.
 * Premium feature - only available for paid subscriptions.
 */

// Supported CMS platforms
export type CMSPlatform =
  | "wordpress"
  | "webflow"
  | "ghost"
  | "medium"
  | "contentful"
  | "strapi"
  | "sanity"
  | "notion"
  | "hubspot"
  | "squarespace";

// CMS platform metadata
export const CMS_PLATFORMS: Record<
  CMSPlatform,
  {
    name: string;
    description: string;
    apiType: "rest" | "graphql";
    authType: "api_key" | "oauth" | "token";
    docsUrl: string;
    icon: string;
  }
> = {
  wordpress: {
    name: "WordPress",
    description: "Self-hosted or WordPress.com sites with REST API",
    apiType: "rest",
    authType: "token",
    docsUrl: "https://developer.wordpress.org/rest-api/",
    icon: "wordpress",
  },
  webflow: {
    name: "Webflow",
    description: "Visual website builder with CMS collections",
    apiType: "rest",
    authType: "api_key",
    docsUrl: "https://developers.webflow.com/",
    icon: "webflow",
  },
  ghost: {
    name: "Ghost",
    description: "Professional publishing platform with Admin API",
    apiType: "rest",
    authType: "api_key",
    docsUrl: "https://ghost.org/docs/admin-api/",
    icon: "ghost",
  },
  medium: {
    name: "Medium",
    description: "Popular blogging platform with integration API",
    apiType: "rest",
    authType: "token",
    docsUrl: "https://github.com/Medium/medium-api-docs",
    icon: "medium",
  },
  contentful: {
    name: "Contentful",
    description: "Headless CMS with Content Management API",
    apiType: "rest",
    authType: "token",
    docsUrl: "https://www.contentful.com/developers/docs/",
    icon: "contentful",
  },
  strapi: {
    name: "Strapi",
    description: "Open-source headless CMS with REST/GraphQL APIs",
    apiType: "rest",
    authType: "token",
    docsUrl: "https://strapi.io/documentation",
    icon: "strapi",
  },
  sanity: {
    name: "Sanity",
    description: "Real-time collaborative content platform",
    apiType: "graphql",
    authType: "token",
    docsUrl: "https://www.sanity.io/docs",
    icon: "sanity",
  },
  notion: {
    name: "Notion",
    description: "All-in-one workspace with database API",
    apiType: "rest",
    authType: "token",
    docsUrl: "https://developers.notion.com/",
    icon: "notion",
  },
  hubspot: {
    name: "HubSpot",
    description: "Marketing platform with blog publishing API",
    apiType: "rest",
    authType: "api_key",
    docsUrl: "https://developers.hubspot.com/docs/api/",
    icon: "hubspot",
  },
  squarespace: {
    name: "Squarespace",
    description: "Website builder with Form & Commerce APIs",
    apiType: "rest",
    authType: "api_key",
    docsUrl: "https://developers.squarespace.com/",
    icon: "squarespace",
  },
};

// Content to publish
export interface CMSContent {
  title: string;
  content: string; // HTML or Markdown
  excerpt?: string;
  slug?: string;
  status?: "draft" | "published" | "scheduled";
  publishedAt?: string;
  tags?: string[];
  categories?: string[];
  featuredImage?: string;
  author?: string;
  metadata?: Record<string, unknown>;
}

// CMS connection configuration
export interface CMSConnection {
  platform: CMSPlatform;
  siteUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  spaceId?: string; // For Contentful
  collectionId?: string; // For Webflow
  databaseId?: string; // For Notion
  isActive: boolean;
  lastSync?: string;
}

// Publish result
export interface PublishResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

// Abstract CMS adapter interface
export interface CMSAdapter {
  platform: CMSPlatform;
  validateConnection(): Promise<boolean>;
  publish(content: CMSContent): Promise<PublishResult>;
  update(postId: string, content: CMSContent): Promise<PublishResult>;
  delete(postId: string): Promise<boolean>;
}

// Factory to get CMS adapter
export function getCMSAdapter(connection: CMSConnection): CMSAdapter | null {
  switch (connection.platform) {
    case "wordpress":
      return new WordPressAdapter(connection);
    case "webflow":
      return new WebflowAdapter(connection);
    case "ghost":
      return new GhostAdapter(connection);
    case "medium":
      return new MediumAdapter(connection);
    case "contentful":
      return new ContentfulAdapter(connection);
    default:
      console.warn(`CMS adapter not implemented for: ${connection.platform}`);
      return null;
  }
}

// ============================================
// WordPress Adapter
// ============================================
class WordPressAdapter implements CMSAdapter {
  platform: CMSPlatform = "wordpress";
  private connection: CMSConnection;

  constructor(connection: CMSConnection) {
    this.connection = connection;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.connection.siteUrl}/wp-json/wp/v2/posts`,
        {
          method: "GET",
          headers: this.getHeaders(),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async publish(content: CMSContent): Promise<PublishResult> {
    try {
      const response = await fetch(
        `${this.connection.siteUrl}/wp-json/wp/v2/posts`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            title: content.title,
            content: content.content,
            excerpt: content.excerpt,
            slug: content.slug,
            status: content.status === "published" ? "publish" : content.status,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const post = await response.json();
      return {
        success: true,
        postId: post.id.toString(),
        postUrl: post.link,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async update(postId: string, content: CMSContent): Promise<PublishResult> {
    try {
      const response = await fetch(
        `${this.connection.siteUrl}/wp-json/wp/v2/posts/${postId}`,
        {
          method: "PUT",
          headers: this.getHeaders(),
          body: JSON.stringify({
            title: content.title,
            content: content.content,
            excerpt: content.excerpt,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const post = await response.json();
      return { success: true, postId: post.id.toString(), postUrl: post.link };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async delete(postId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.connection.siteUrl}/wp-json/wp/v2/posts/${postId}`,
        {
          method: "DELETE",
          headers: this.getHeaders(),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.connection.accessToken}`,
    };
  }
}

// ============================================
// Webflow Adapter
// ============================================
class WebflowAdapter implements CMSAdapter {
  platform: CMSPlatform = "webflow";
  private connection: CMSConnection;
  private baseUrl = "https://api.webflow.com/v2";

  constructor(connection: CMSConnection) {
    this.connection = connection;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sites`, {
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async publish(content: CMSContent): Promise<PublishResult> {
    if (!this.connection.collectionId) {
      return { success: false, error: "Collection ID required for Webflow" };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/collections/${this.connection.collectionId}/items`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            fieldData: {
              name: content.title,
              slug:
                content.slug ||
                content.title.toLowerCase().replace(/\s+/g, "-"),
              "post-body": content.content,
              "post-summary": content.excerpt,
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const item = await response.json();
      return { success: true, postId: item.id };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async update(postId: string, content: CMSContent): Promise<PublishResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/collections/${this.connection.collectionId}/items/${postId}`,
        {
          method: "PATCH",
          headers: this.getHeaders(),
          body: JSON.stringify({
            fieldData: {
              name: content.title,
              "post-body": content.content,
              "post-summary": content.excerpt,
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true, postId };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async delete(postId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/collections/${this.connection.collectionId}/items/${postId}`,
        {
          method: "DELETE",
          headers: this.getHeaders(),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.connection.apiKey}`,
    };
  }
}

// ============================================
// Ghost Adapter
// ============================================
class GhostAdapter implements CMSAdapter {
  platform: CMSPlatform = "ghost";
  private connection: CMSConnection;

  constructor(connection: CMSConnection) {
    this.connection = connection;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const token = this.generateJWT();
      const response = await fetch(
        `${this.connection.siteUrl}/ghost/api/admin/posts/`,
        {
          headers: { Authorization: `Ghost ${token}` },
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async publish(content: CMSContent): Promise<PublishResult> {
    try {
      const token = this.generateJWT();
      const response = await fetch(
        `${this.connection.siteUrl}/ghost/api/admin/posts/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Ghost ${token}`,
          },
          body: JSON.stringify({
            posts: [
              {
                title: content.title,
                html: content.content,
                custom_excerpt: content.excerpt,
                slug: content.slug,
                status: content.status === "published" ? "published" : "draft",
                tags: content.tags?.map((t) => ({ name: t })),
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const data = await response.json();
      const post = data.posts[0];
      return { success: true, postId: post.id, postUrl: post.url };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async update(postId: string, content: CMSContent): Promise<PublishResult> {
    try {
      const token = this.generateJWT();
      const response = await fetch(
        `${this.connection.siteUrl}/ghost/api/admin/posts/${postId}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Ghost ${token}`,
          },
          body: JSON.stringify({
            posts: [
              {
                title: content.title,
                html: content.content,
                custom_excerpt: content.excerpt,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true, postId };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async delete(postId: string): Promise<boolean> {
    try {
      const token = this.generateJWT();
      const response = await fetch(
        `${this.connection.siteUrl}/ghost/api/admin/posts/${postId}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Ghost ${token}` },
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private generateJWT(): string {
    // Ghost Admin API uses a special JWT format
    // Key format: id:secret
    const [id] = (this.connection.apiKey || "").split(":");

    // In production, use a proper JWT library
    // This is a simplified placeholder
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }),
    ).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" }),
    ).toString("base64url");

    // Note: In production, properly sign with the secret
    return `${header}.${payload}.signature`;
  }
}

// ============================================
// Medium Adapter
// ============================================
class MediumAdapter implements CMSAdapter {
  platform: CMSPlatform = "medium";
  private connection: CMSConnection;
  private baseUrl = "https://api.medium.com/v1";

  constructor(connection: CMSConnection) {
    this.connection = connection;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async publish(content: CMSContent): Promise<PublishResult> {
    try {
      // First get user ID
      const meResponse = await fetch(`${this.baseUrl}/me`, {
        headers: this.getHeaders(),
      });

      if (!meResponse.ok) {
        return { success: false, error: "Failed to get Medium user" };
      }

      const { data: user } = await meResponse.json();

      const response = await fetch(`${this.baseUrl}/users/${user.id}/posts`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          title: content.title,
          contentFormat: "html",
          content: content.content,
          tags: content.tags?.slice(0, 5), // Medium allows max 5 tags
          publishStatus: content.status === "published" ? "public" : "draft",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const { data: post } = await response.json();
      return { success: true, postId: post.id, postUrl: post.url };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async update(): Promise<PublishResult> {
    // Medium API doesn't support updating posts
    return {
      success: false,
      error: "Medium does not support post updates via API",
    };
  }

  async delete(): Promise<boolean> {
    // Medium API doesn't support deleting posts
    return false;
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.connection.accessToken}`,
    };
  }
}

// ============================================
// Contentful Adapter
// ============================================
class ContentfulAdapter implements CMSAdapter {
  platform: CMSPlatform = "contentful";
  private connection: CMSConnection;

  constructor(connection: CMSConnection) {
    this.connection = connection;
  }

  get baseUrl(): string {
    return `https://api.contentful.com/spaces/${this.connection.spaceId}`;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/environments/master/content_types`,
        {
          headers: this.getHeaders(),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async publish(content: CMSContent): Promise<PublishResult> {
    try {
      // Create entry
      const createResponse = await fetch(
        `${this.baseUrl}/environments/master/entries`,
        {
          method: "POST",
          headers: {
            ...this.getHeaders(),
            "X-Contentful-Content-Type": "blogPost", // Assumes content type exists
          },
          body: JSON.stringify({
            fields: {
              title: { "en-US": content.title },
              body: { "en-US": content.content },
              excerpt: { "en-US": content.excerpt },
              slug: { "en-US": content.slug },
            },
          }),
        },
      );

      if (!createResponse.ok) {
        const error = await createResponse.text();
        return { success: false, error };
      }

      const entry = await createResponse.json();

      // Publish if requested
      if (content.status === "published") {
        await fetch(
          `${this.baseUrl}/environments/master/entries/${entry.sys.id}/published`,
          {
            method: "PUT",
            headers: {
              ...this.getHeaders(),
              "X-Contentful-Version": entry.sys.version.toString(),
            },
          },
        );
      }

      return { success: true, postId: entry.sys.id };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async update(postId: string, content: CMSContent): Promise<PublishResult> {
    try {
      // Get current version
      const getResponse = await fetch(
        `${this.baseUrl}/environments/master/entries/${postId}`,
        { headers: this.getHeaders() },
      );

      if (!getResponse.ok) {
        return { success: false, error: "Entry not found" };
      }

      const currentEntry = await getResponse.json();

      const response = await fetch(
        `${this.baseUrl}/environments/master/entries/${postId}`,
        {
          method: "PUT",
          headers: {
            ...this.getHeaders(),
            "X-Contentful-Version": currentEntry.sys.version.toString(),
          },
          body: JSON.stringify({
            fields: {
              title: { "en-US": content.title },
              body: { "en-US": content.content },
              excerpt: { "en-US": content.excerpt },
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true, postId };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async delete(postId: string): Promise<boolean> {
    try {
      // Unpublish first
      await fetch(
        `${this.baseUrl}/environments/master/entries/${postId}/published`,
        {
          method: "DELETE",
          headers: this.getHeaders(),
        },
      );

      // Then delete
      const response = await fetch(
        `${this.baseUrl}/environments/master/entries/${postId}`,
        {
          method: "DELETE",
          headers: this.getHeaders(),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.connection.accessToken}`,
    };
  }
}

