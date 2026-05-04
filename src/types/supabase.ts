export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          created_at: string
          name: string
          logo_url: string | null
          primary_color: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          logo_url?: string | null
          primary_color?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          logo_url?: string | null
          primary_color?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          created_at: string
          restaurant_id: string
          name: string
          order_index: number
        }
        Insert: {
          id?: string
          created_at?: string
          restaurant_id: string
          name: string
          order_index?: number
        }
        Update: {
          id?: string
          created_at?: string
          restaurant_id?: string
          name?: string
          order_index?: number
        }
      }
      menu_items: {
        Row: {
          id: string
          created_at: string
          category_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          is_available: boolean
          order_index: number
        }
        Insert: {
          id?: string
          created_at?: string
          category_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          is_available?: boolean
          order_index?: number
        }
        Update: {
          id?: string
          created_at?: string
          category_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          is_available?: boolean
          order_index?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
