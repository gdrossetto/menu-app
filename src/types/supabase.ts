export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          created_at: string;
          owner_id: string;
          name: string;
          logo_url: string | null;
          primary_color: string | null;
          currency_symbol: string | null;
          plan_tier: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          subscription_status: string | null;
          subscription_current_period_end: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          owner_id?: string;
          name: string;
          logo_url?: string | null;
          primary_color?: string | null;
          currency_symbol?: string | null;
          plan_tier?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          subscription_status?: string | null;
          subscription_current_period_end?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          owner_id?: string;
          name?: string;
          logo_url?: string | null;
          primary_color?: string | null;
          currency_symbol?: string | null;
          plan_tier?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          subscription_status?: string | null;
          subscription_current_period_end?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          created_at: string;
          restaurant_id: string;
          name: string;
          order_index: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          restaurant_id: string;
          name: string;
          order_index?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          restaurant_id?: string;
          name?: string;
          order_index?: number;
        };
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          id: string;
          created_at: string;
          category_id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          is_available: boolean;
          order_index: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          category_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          is_available?: boolean;
          order_index?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          image_url?: string | null;
          is_available?: boolean;
          order_index?: number;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_views: {
        Row: {
          id: string;
          restaurant_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_views_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
