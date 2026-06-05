export interface Database {
  public: {
    Tables: {
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          created_at: string;
        };
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
      };
    };
  };
}
