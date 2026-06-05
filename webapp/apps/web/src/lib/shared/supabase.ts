type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at?: string;
        };
        Update: {
          workspace_id?: string;
          user_id?: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
        Relationships: [];
      };
      images: {
        Row: {
          id: string;
          workspace_id: string;
          storage_key: string;
          public_url: string | null;
          thumbnail_url: string | null;
          prompt: string;
          aspect_ratio: string;
          width: number | null;
          height: number | null;
          mime_type: string | null;
          filename: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          storage_key: string;
          public_url?: string | null;
          thumbnail_url?: string | null;
          prompt: string;
          aspect_ratio: string;
          width?: number | null;
          height?: number | null;
          mime_type?: string | null;
          filename: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          storage_key?: string;
          public_url?: string | null;
          thumbnail_url?: string | null;
          prompt?: string;
          aspect_ratio?: string;
          width?: number | null;
          height?: number | null;
          mime_type?: string | null;
          filename?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
