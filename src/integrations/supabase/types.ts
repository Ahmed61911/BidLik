export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      _app_migrations: {
        Row: {
          applied_at: string
          filename: string
        }
        Insert: {
          applied_at?: string
          filename: string
        }
        Update: {
          applied_at?: string
          filename?: string
        }
        Relationships: []
      }
      auction_events: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          starts_at: string
          status: Database["public"]["Enums"]["auction_status_t"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["auction_visibility_t"]
        }
        Insert: {
          created_at?: string
          ends_at: string
          id: string
          starts_at: string
          status?: Database["public"]["Enums"]["auction_status_t"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["auction_visibility_t"]
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["auction_status_t"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["auction_visibility_t"]
        }
        Relationships: []
      }
      auctions: {
        Row: {
          admin_validation_deadline: string | null
          auction_type: Database["public"]["Enums"]["auction_type_t"]
          bid_count: number
          car_id: string
          closed_at: string | null
          created_at: string
          current_price: number
          ends_at: string
          event_id: string | null
          id: string
          payment_deadline: string | null
          starting_price: number
          starts_at: string
          status: Database["public"]["Enums"]["auction_status_t"]
          top_bidder_id: string | null
          updated_at: string
          validated_at: string | null
          visibility: Database["public"]["Enums"]["auction_visibility_t"]
        }
        Insert: {
          admin_validation_deadline?: string | null
          auction_type?: Database["public"]["Enums"]["auction_type_t"]
          bid_count?: number
          car_id: string
          closed_at?: string | null
          created_at?: string
          current_price: number
          ends_at: string
          event_id?: string | null
          id: string
          payment_deadline?: string | null
          starting_price: number
          starts_at: string
          status?: Database["public"]["Enums"]["auction_status_t"]
          top_bidder_id?: string | null
          updated_at?: string
          validated_at?: string | null
          visibility?: Database["public"]["Enums"]["auction_visibility_t"]
        }
        Update: {
          admin_validation_deadline?: string | null
          auction_type?: Database["public"]["Enums"]["auction_type_t"]
          bid_count?: number
          car_id?: string
          closed_at?: string | null
          created_at?: string
          current_price?: number
          ends_at?: string
          event_id?: string | null
          id?: string
          payment_deadline?: string | null
          starting_price?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["auction_status_t"]
          top_bidder_id?: string | null
          updated_at?: string
          validated_at?: string | null
          visibility?: Database["public"]["Enums"]["auction_visibility_t"]
        }
        Relationships: [
          {
            foreignKeyName: "auctions_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "auction_events"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_bids: {
        Row: {
          auction_id: string
          created_at: string
          enabled: boolean
          id: string
          max_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auction_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          max_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auction_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          max_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          bidder_id: string
          bidder_name: string
          car_id: string
          created_at: string
          id: string
          is_auto: boolean
        }
        Insert: {
          amount: number
          auction_id: string
          bidder_id: string
          bidder_name?: string
          car_id: string
          created_at?: string
          id?: string
          is_auto?: boolean
        }
        Update: {
          amount?: number
          auction_id?: string
          bidder_id?: string
          bidder_name?: string
          car_id?: string
          created_at?: string
          id?: string
          is_auto?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      cars: {
        Row: {
          annee: number
          body_type: string | null
          carburant: Database["public"]["Enums"]["carburant_t"]
          carte_grise_barree: boolean
          couleur_exterieur: string
          couleur_interieur: string
          created_at: string
          date_vente: string | null
          delivery_status: Database["public"]["Enums"]["delivery_status_t"]
          expert_images: Json
          finition: string
          id: string
          images: Json
          kilometrage: number
          main_levee: boolean
          marque: string
          minimum_accepted_price: number | null
          modele: string
          nombre_cles: number
          note_expert: number | null
          opposition: boolean
          payment_status: Database["public"]["Enums"]["payment_status_t"]
          prix_attendu: number
          prix_minimum: number | null
          prix_plancher: number | null
          procuration: Database["public"]["Enums"]["procuration_t"]
          puissance_fiscale: number
          status: Database["public"]["Enums"]["car_status"]
          transmission: Database["public"]["Enums"]["transmission_t"]
          type: Database["public"]["Enums"]["car_type_t"]
          updated_at: string
          vendeur_id: string | null
          vendeur_nom: string
        }
        Insert: {
          annee: number
          body_type?: string | null
          carburant?: Database["public"]["Enums"]["carburant_t"]
          carte_grise_barree?: boolean
          couleur_exterieur?: string
          couleur_interieur?: string
          created_at?: string
          date_vente?: string | null
          delivery_status?: Database["public"]["Enums"]["delivery_status_t"]
          expert_images?: Json
          finition?: string
          id: string
          images?: Json
          kilometrage?: number
          main_levee?: boolean
          marque: string
          minimum_accepted_price?: number | null
          modele: string
          nombre_cles?: number
          note_expert?: number | null
          opposition?: boolean
          payment_status?: Database["public"]["Enums"]["payment_status_t"]
          prix_attendu?: number
          prix_minimum?: number | null
          prix_plancher?: number | null
          procuration?: Database["public"]["Enums"]["procuration_t"]
          puissance_fiscale?: number
          status?: Database["public"]["Enums"]["car_status"]
          transmission?: Database["public"]["Enums"]["transmission_t"]
          type?: Database["public"]["Enums"]["car_type_t"]
          updated_at?: string
          vendeur_id?: string | null
          vendeur_nom?: string
        }
        Update: {
          annee?: number
          body_type?: string | null
          carburant?: Database["public"]["Enums"]["carburant_t"]
          carte_grise_barree?: boolean
          couleur_exterieur?: string
          couleur_interieur?: string
          created_at?: string
          date_vente?: string | null
          delivery_status?: Database["public"]["Enums"]["delivery_status_t"]
          expert_images?: Json
          finition?: string
          id?: string
          images?: Json
          kilometrage?: number
          main_levee?: boolean
          marque?: string
          minimum_accepted_price?: number | null
          modele?: string
          nombre_cles?: number
          note_expert?: number | null
          opposition?: boolean
          payment_status?: Database["public"]["Enums"]["payment_status_t"]
          prix_attendu?: number
          prix_minimum?: number | null
          prix_plancher?: number | null
          procuration?: Database["public"]["Enums"]["procuration_t"]
          puissance_fiscale?: number
          status?: Database["public"]["Enums"]["car_status"]
          transmission?: Database["public"]["Enums"]["transmission_t"]
          type?: Database["public"]["Enums"]["car_type_t"]
          updated_at?: string
          vendeur_id?: string | null
          vendeur_nom?: string
        }
        Relationships: []
      }
      expert_assignments: {
        Row: {
          assigne_le: string | null
          car_id: string
          checklist: Json | null
          commentaire: string | null
          created_at: string
          expert_id: string | null
          id: string
          note_finale: number | null
          rapport_name: string | null
          rapport_recu_le: string | null
          rapport_url: string | null
          status: Database["public"]["Enums"]["expert_assignment_status_t"]
          updated_at: string
        }
        Insert: {
          assigne_le?: string | null
          car_id: string
          checklist?: Json | null
          commentaire?: string | null
          created_at?: string
          expert_id?: string | null
          id?: string
          note_finale?: number | null
          rapport_name?: string | null
          rapport_recu_le?: string | null
          rapport_url?: string | null
          status?: Database["public"]["Enums"]["expert_assignment_status_t"]
          updated_at?: string
        }
        Update: {
          assigne_le?: string | null
          car_id?: string
          checklist?: Json | null
          commentaire?: string | null
          created_at?: string
          expert_id?: string | null
          id?: string
          note_finale?: number | null
          rapport_name?: string | null
          rapport_recu_le?: string | null
          rapport_url?: string | null
          status?: Database["public"]["Enums"]["expert_assignment_status_t"]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          auction_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          titre: string
          type: Database["public"]["Enums"]["notif_type_t"]
          user_id: string
        }
        Insert: {
          auction_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          titre: string
          type: Database["public"]["Enums"]["notif_type_t"]
          user_id: string
        }
        Update: {
          auction_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          titre?: string
          type?: Database["public"]["Enums"]["notif_type_t"]
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          amount: number
          auction_id: string
          car_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["offer_status_t"]
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          amount: number
          auction_id: string
          car_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["offer_status_t"]
          updated_at?: string
          user_id: string
          user_name?: string
        }
        Update: {
          amount?: number
          auction_id?: string
          car_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["offer_status_t"]
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          auction_id: string | null
          bank: string | null
          car_id: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          proof_name: string | null
          proof_url: string | null
          recorded_by: string | null
          reference: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          auction_id?: string | null
          bank?: string | null
          car_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          proof_name?: string | null
          proof_url?: string | null
          recorded_by?: string | null
          reference?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auction_id?: string | null
          bank?: string | null
          car_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          proof_name?: string | null
          proof_url?: string | null
          recorded_by?: string | null
          reference?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          actif: boolean
          avatar_url: string | null
          caution_montant: number
          caution_validee: boolean
          created_at: string
          email: string | null
          id: string
          nom: string
          telephone: string | null
          updated_at: string
          user_id: string
          ville: string | null
        }
        Insert: {
          actif?: boolean
          avatar_url?: string | null
          caution_montant?: number
          caution_validee?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          telephone?: string | null
          updated_at?: string
          user_id: string
          ville?: string | null
        }
        Update: {
          actif?: boolean
          avatar_url?: string | null
          caution_montant?: number
          caution_validee?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          telephone?: string | null
          updated_at?: string
          user_id?: string
          ville?: string | null
        }
        Relationships: []
      }
      storage_files: {
        Row: {
          bucket: string
          car_id: string | null
          file_category: string
          file_size: number
          id: string
          mime_type: string
          original_filename: string
          owner: string | null
          relative_path: string
          stored_filename: string
          upload_date: string
        }
        Insert: {
          bucket: string
          car_id?: string | null
          file_category: string
          file_size: number
          id?: string
          mime_type: string
          original_filename: string
          owner?: string | null
          relative_path: string
          stored_filename: string
          upload_date?: string
        }
        Update: {
          bucket?: string
          car_id?: string | null
          file_category?: string
          file_size?: number
          id?: string
          mime_type?: string
          original_filename?: string
          owner?: string | null
          relative_path?: string
          stored_filename?: string
          upload_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_files_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_auction_stats: {
        Args: { p_since: string }
        Returns: {
          closed_month_total: number
          closed_month_with_bids: number
          live_auctions: number
          pending_validations: number
          total_auctions: number
          total_validated_volume: number
          validated_month_count: number
          validated_month_volume: number
        }[]
      }
      admin_delete_payment: { Args: { p_id: string }; Returns: undefined }
      admin_get_auction: {
        Args: { p_id: string }
        Returns: {
          admin_validation_deadline: string | null
          auction_type: Database["public"]["Enums"]["auction_type_t"]
          bid_count: number
          car_id: string
          closed_at: string | null
          created_at: string
          current_price: number
          ends_at: string
          event_id: string | null
          id: string
          payment_deadline: string | null
          starting_price: number
          starts_at: string
          status: Database["public"]["Enums"]["auction_status_t"]
          top_bidder_id: string | null
          updated_at: string
          validated_at: string | null
          visibility: Database["public"]["Enums"]["auction_visibility_t"]
        }
        SetofOptions: {
          from: "*"
          to: "auctions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_get_profile: {
        Args: { p_user_id: string }
        Returns: {
          actif: boolean
          avatar_url: string
          caution_montant: number
          caution_validee: boolean
          email: string
          nom: string
          telephone: string
          user_id: string
          ville: string
        }[]
      }
      admin_list_auctions: {
        Args: never
        Returns: {
          admin_validation_deadline: string | null
          auction_type: Database["public"]["Enums"]["auction_type_t"]
          bid_count: number
          car_id: string
          closed_at: string | null
          created_at: string
          current_price: number
          ends_at: string
          event_id: string | null
          id: string
          payment_deadline: string | null
          starting_price: number
          starts_at: string
          status: Database["public"]["Enums"]["auction_status_t"]
          top_bidder_id: string | null
          updated_at: string
          validated_at: string | null
          visibility: Database["public"]["Enums"]["auction_visibility_t"]
        }[]
        SetofOptions: {
          from: "*"
          to: "auctions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_cars: {
        Args: never
        Returns: {
          annee: number
          body_type: string | null
          carburant: Database["public"]["Enums"]["carburant_t"]
          carte_grise_barree: boolean
          couleur_exterieur: string
          couleur_interieur: string
          created_at: string
          date_vente: string | null
          delivery_status: Database["public"]["Enums"]["delivery_status_t"]
          expert_images: Json
          finition: string
          id: string
          images: Json
          kilometrage: number
          main_levee: boolean
          marque: string
          minimum_accepted_price: number | null
          modele: string
          nombre_cles: number
          note_expert: number | null
          opposition: boolean
          payment_status: Database["public"]["Enums"]["payment_status_t"]
          prix_attendu: number
          prix_minimum: number | null
          prix_plancher: number | null
          procuration: Database["public"]["Enums"]["procuration_t"]
          puissance_fiscale: number
          status: Database["public"]["Enums"]["car_status"]
          transmission: Database["public"]["Enums"]["transmission_t"]
          type: Database["public"]["Enums"]["car_type_t"]
          updated_at: string
          vendeur_id: string | null
          vendeur_nom: string
        }[]
        SetofOptions: {
          from: "*"
          to: "cars"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_cars_by_ids: {
        Args: { p_ids: string[] }
        Returns: {
          annee: number
          body_type: string | null
          carburant: Database["public"]["Enums"]["carburant_t"]
          carte_grise_barree: boolean
          couleur_exterieur: string
          couleur_interieur: string
          created_at: string
          date_vente: string | null
          delivery_status: Database["public"]["Enums"]["delivery_status_t"]
          expert_images: Json
          finition: string
          id: string
          images: Json
          kilometrage: number
          main_levee: boolean
          marque: string
          minimum_accepted_price: number | null
          modele: string
          nombre_cles: number
          note_expert: number | null
          opposition: boolean
          payment_status: Database["public"]["Enums"]["payment_status_t"]
          prix_attendu: number
          prix_minimum: number | null
          prix_plancher: number | null
          procuration: Database["public"]["Enums"]["procuration_t"]
          puissance_fiscale: number
          status: Database["public"]["Enums"]["car_status"]
          transmission: Database["public"]["Enums"]["transmission_t"]
          type: Database["public"]["Enums"]["car_type_t"]
          updated_at: string
          vendeur_id: string | null
          vendeur_nom: string
        }[]
        SetofOptions: {
          from: "*"
          to: "cars"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_expertise_ready: {
        Args: never
        Returns: {
          car: Database["public"]["Tables"]["cars"]["Row"]
          note_finale: number
        }[]
      }
      admin_list_payments: {
        Args: never
        Returns: {
          amount: number
          auction_id: string
          bank: string
          car_id: string
          car_label: string
          created_at: string
          due_date: string
          id: string
          notes: string
          paid_at: string
          payment_method: string
          proof_name: string
          proof_url: string
          reference: string
          status: string
          type: string
          updated_at: string
          user_email: string
          user_id: string
          user_nom: string
        }[]
      }
      admin_list_pending_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          nom: string
          role: Database["public"]["Enums"]["app_role"]
          telephone: string
          user_id: string
        }[]
      }
      admin_list_pending_validations: {
        Args: never
        Returns: {
          admin_validation_deadline: string
          annee: number
          car_id: string
          closed_at: string
          current_price: number
          ends_at: string
          id: string
          marque: string
          modele: string
          prix_attendu: number
          top_bidder_id: string
          updated_at: string
          vendeur_nom: string
        }[]
      }
      admin_list_processed_validations: {
        Args: never
        Returns: {
          annee: number
          car_id: string
          current_price: number
          id: string
          marque: string
          modele: string
          payment_deadline: string
          status: Database["public"]["Enums"]["auction_status_t"]
          top_bidder_id: string
          updated_at: string
          validated_at: string
          vendeur_nom: string
        }[]
      }
      admin_list_profiles: {
        Args: never
        Returns: {
          actif: boolean
          caution_montant: number
          caution_validee: boolean
          created_at: string
          email: string
          nom: string
          telephone: string
          user_id: string
        }[]
      }
      admin_refund_caution:
        | {
            Args: {
              p_id: string
              p_notes?: string
              p_proof_name?: string
              p_proof_url?: string
              p_reference?: string
            }
            Returns: {
              amount: number
              auction_id: string | null
              bank: string | null
              car_id: string | null
              created_at: string
              due_date: string | null
              id: string
              notes: string | null
              paid_at: string | null
              payment_method: string | null
              proof_name: string | null
              proof_url: string | null
              recorded_by: string | null
              reference: string | null
              status: string
              type: string
              updated_at: string
              user_id: string
            }
            SetofOptions: {
              from: "*"
              to: "payments"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_bank?: string
              p_id: string
              p_notes?: string
              p_payment_method?: string
              p_proof_name?: string
              p_proof_url?: string
              p_reference?: string
            }
            Returns: {
              amount: number
              auction_id: string | null
              bank: string | null
              car_id: string | null
              created_at: string
              due_date: string | null
              id: string
              notes: string | null
              paid_at: string | null
              payment_method: string | null
              proof_name: string | null
              proof_url: string | null
              recorded_by: string | null
              reference: string | null
              status: string
              type: string
              updated_at: string
              user_id: string
            }
            SetofOptions: {
              from: "*"
              to: "payments"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      admin_revenue_series: {
        Args: { p_since: string }
        Returns: {
          current_price: number
          status: Database["public"]["Enums"]["auction_status_t"]
          updated_at: string
        }[]
      }
      admin_set_payment_status: {
        Args: { p_id: string; p_status: string }
        Returns: {
          amount: number
          auction_id: string | null
          bank: string | null
          car_id: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          proof_name: string | null
          proof_url: string | null
          recorded_by: string | null
          reference: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_user_active: {
        Args: { p_actif: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_upsert_payment: {
        Args: {
          p_amount: number
          p_auction_id: string
          p_bank?: string
          p_car_id: string
          p_due_date?: string
          p_id: string
          p_notes: string
          p_paid_at: string
          p_payment_method?: string
          p_proof_name: string
          p_proof_url: string
          p_reference: string
          p_status: string
          p_type: string
          p_user_id: string
        }
        Returns: {
          amount: number
          auction_id: string | null
          bank: string | null
          car_id: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          proof_name: string | null
          proof_url: string | null
          recorded_by: string | null
          reference: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_validate_caution: {
        Args: { p_decision: string; p_id: string }
        Returns: {
          amount: number
          auction_id: string | null
          bank: string | null
          car_id: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          proof_name: string | null
          proof_url: string | null
          recorded_by: string | null
          reference: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      am_i_top_bidder: { Args: { p_id: string }; Returns: boolean }
      assign_expert: {
        Args: { p_car_id: string; p_expert_id: string }
        Returns: {
          assigne_le: string | null
          car_id: string
          checklist: Json | null
          commentaire: string | null
          created_at: string
          expert_id: string | null
          id: string
          note_finale: number | null
          rapport_name: string | null
          rapport_recu_le: string | null
          rapport_url: string | null
          status: Database["public"]["Enums"]["expert_assignment_status_t"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "expert_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      buyer_submit_caution: {
        Args: {
          p_amount: number
          p_bank: string
          p_notes: string
          p_payment_method: string
          p_proof_name: string
          p_proof_url: string
          p_reference: string
        }
        Returns: {
          amount: number
          auction_id: string | null
          bank: string | null
          car_id: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          proof_name: string | null
          proof_url: string | null
          recorded_by: string | null
          reference: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      buyer_submit_payment: {
        Args: {
          p_amount: number
          p_auction_id: string
          p_bank?: string
          p_due_date?: string
          p_notes: string
          p_payment_method?: string
          p_proof_name: string
          p_proof_url: string
          p_reference: string
        }
        Returns: {
          amount: number
          auction_id: string | null
          bank: string | null
          car_id: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          proof_name: string | null
          proof_url: string | null
          recorded_by: string | null
          reference: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expert_list_car_details: {
        Args: { p_ids: string[] }
        Returns: {
          annee: number
          body_type: string
          carburant: string
          couleur_exterieur: string
          couleur_interieur: string
          expert_images: Json
          id: string
          images: Json
          kilometrage: number
          marque: string
          modele: string
          transmission: string
          vendeur_id: string
          vendeur_nom: string
        }[]
      }
      get_car_expertise: {
        Args: { p_car_id: string }
        Returns: {
          checklist: Json
          commentaire: string
          expert_images: Json
          note_finale: number
          rapport_name: string
          rapport_recu_le: string
          rapport_url: string
        }[]
      }
      get_car_full: {
        Args: { p_car_id: string }
        Returns: {
          annee: number
          body_type: string | null
          carburant: Database["public"]["Enums"]["carburant_t"]
          carte_grise_barree: boolean
          couleur_exterieur: string
          couleur_interieur: string
          created_at: string
          date_vente: string | null
          delivery_status: Database["public"]["Enums"]["delivery_status_t"]
          expert_images: Json
          finition: string
          id: string
          images: Json
          kilometrage: number
          main_levee: boolean
          marque: string
          minimum_accepted_price: number | null
          modele: string
          nombre_cles: number
          note_expert: number | null
          opposition: boolean
          payment_status: Database["public"]["Enums"]["payment_status_t"]
          prix_attendu: number
          prix_minimum: number | null
          prix_plancher: number | null
          procuration: Database["public"]["Enums"]["procuration_t"]
          puissance_fiscale: number
          status: Database["public"]["Enums"]["car_status"]
          transmission: Database["public"]["Enums"]["transmission_t"]
          type: Database["public"]["Enums"]["car_type_t"]
          updated_at: string
          vendeur_id: string | null
          vendeur_nom: string
        }
        SetofOptions: {
          from: "*"
          to: "cars"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string
          caution_montant: number
          caution_validee: boolean
          email: string
          nom: string
          telephone: string
          user_id: string
          ville: string
        }[]
      }
      get_my_won_car_details: { Args: { p_auction_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_expert: {
        Args: { p_car_id: string; p_uid: string }
        Returns: boolean
      }
      is_car_owner: {
        Args: { p_car_id: string; p_uid: string }
        Returns: boolean
      }
      is_my_account_active: { Args: never; Returns: boolean }
      list_auction_bids: {
        Args: { p_auction_id: string }
        Returns: {
          amount: number
          auction_id: string
          bidder_name: string
          car_id: string
          created_at: string
          id: string
          is_auto: boolean
          is_own: boolean
        }[]
      }
      list_my_pending_payment_auctions: {
        Args: never
        Returns: {
          admin_validation_deadline: string | null
          auction_type: Database["public"]["Enums"]["auction_type_t"]
          bid_count: number
          car_id: string
          closed_at: string | null
          created_at: string
          current_price: number
          ends_at: string
          event_id: string | null
          id: string
          payment_deadline: string | null
          starting_price: number
          starts_at: string
          status: Database["public"]["Enums"]["auction_status_t"]
          top_bidder_id: string | null
          updated_at: string
          validated_at: string | null
          visibility: Database["public"]["Enums"]["auction_visibility_t"]
        }[]
        SetofOptions: {
          from: "*"
          to: "auctions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_my_seller_cars: {
        Args: never
        Returns: {
          annee: number
          body_type: string | null
          carburant: Database["public"]["Enums"]["carburant_t"]
          carte_grise_barree: boolean
          couleur_exterieur: string
          couleur_interieur: string
          created_at: string
          date_vente: string | null
          delivery_status: Database["public"]["Enums"]["delivery_status_t"]
          expert_images: Json
          finition: string
          id: string
          images: Json
          kilometrage: number
          main_levee: boolean
          marque: string
          minimum_accepted_price: number | null
          modele: string
          nombre_cles: number
          note_expert: number | null
          opposition: boolean
          payment_status: Database["public"]["Enums"]["payment_status_t"]
          prix_attendu: number
          prix_minimum: number | null
          prix_plancher: number | null
          procuration: Database["public"]["Enums"]["procuration_t"]
          puissance_fiscale: number
          status: Database["public"]["Enums"]["car_status"]
          transmission: Database["public"]["Enums"]["transmission_t"]
          type: Database["public"]["Enums"]["car_type_t"]
          updated_at: string
          vendeur_id: string | null
          vendeur_nom: string
        }[]
        SetofOptions: {
          from: "*"
          to: "cars"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_my_won_auctions: {
        Args: never
        Returns: {
          annee: number
          auction_id: string
          auction_status: Database["public"]["Enums"]["auction_status_t"]
          car_id: string
          car_status: Database["public"]["Enums"]["car_status"]
          closed_at: string
          delivery_status: Database["public"]["Enums"]["delivery_status_t"]
          marque: string
          modele: string
          payment_deadline: string
          payment_status: Database["public"]["Enums"]["payment_status_t"]
          prix_final: number
          updated_at: string
          validated_at: string
        }[]
      }
      my_leading_auctions: {
        Args: { p_ids: string[] }
        Returns: {
          auction_id: string
        }[]
      }
      place_bid: {
        Args: { p_amount: number; p_auction_id: string; p_is_auto?: boolean }
        Returns: {
          amount: number
          auction_id: string
          bidder_id: string
          bidder_name: string
          car_id: string
          created_at: string
          id: string
          is_auto: boolean
        }
        SetofOptions: {
          from: "*"
          to: "bids"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      process_auto_bids: { Args: { p_auction_id: string }; Returns: undefined }
      seller_list_my_car_auctions: {
        Args: never
        Returns: {
          admin_validation_deadline: string | null
          auction_type: Database["public"]["Enums"]["auction_type_t"]
          bid_count: number
          car_id: string
          closed_at: string | null
          created_at: string
          current_price: number
          ends_at: string
          event_id: string | null
          id: string
          payment_deadline: string | null
          starting_price: number
          starts_at: string
          status: Database["public"]["Enums"]["auction_status_t"]
          top_bidder_id: string | null
          updated_at: string
          validated_at: string | null
          visibility: Database["public"]["Enums"]["auction_visibility_t"]
        }[]
        SetofOptions: {
          from: "*"
          to: "auctions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_auto_bid: {
        Args: {
          p_auction_id: string
          p_enabled: boolean
          p_max_amount?: number
        }
        Returns: {
          auction_id: string
          created_at: string
          enabled: boolean
          id: string
          max_amount: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "auto_bids"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_expert_report: {
        Args: {
          p_car_id: string
          p_checklist?: Json
          p_commentaire?: string
          p_note: number
          p_rapport_name?: string
          p_rapport_url?: string
        }
        Returns: {
          assigne_le: string | null
          car_id: string
          checklist: Json | null
          commentaire: string | null
          created_at: string
          expert_id: string | null
          id: string
          note_finale: number | null
          rapport_name: string | null
          rapport_recu_le: string | null
          rapport_url: string | null
          status: Database["public"]["Enums"]["expert_assignment_status_t"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "expert_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_offer: {
        Args: { p_amount: number; p_auction_id: string }
        Returns: {
          amount: number
          auction_id: string
          car_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["offer_status_t"]
          updated_at: string
          user_id: string
          user_name: string
        }
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tick_auctions: { Args: never; Returns: undefined }
      update_my_profile: {
        Args: { p_nom?: string; p_telephone?: string; p_ville?: string }
        Returns: undefined
      }
      validate_auction: {
        Args: { p_auction_id: string; p_decision: string }
        Returns: {
          admin_validation_deadline: string | null
          auction_type: Database["public"]["Enums"]["auction_type_t"]
          bid_count: number
          car_id: string
          closed_at: string | null
          created_at: string
          current_price: number
          ends_at: string
          event_id: string | null
          id: string
          payment_deadline: string | null
          starting_price: number
          starts_at: string
          status: Database["public"]["Enums"]["auction_status_t"]
          top_bidder_id: string | null
          updated_at: string
          validated_at: string | null
          visibility: Database["public"]["Enums"]["auction_visibility_t"]
        }
        SetofOptions: {
          from: "*"
          to: "auctions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "acheteur" | "vendeur" | "expert" | "admin"
      auction_status_t:
        | "scheduled"
        | "live"
        | "closed"
        | "validated"
        | "cancelled"
      auction_type_t: "ouverte" | "fermee"
      auction_visibility_t: "ouvert" | "ferme"
      car_status:
        | "open"
        | "en_cours"
        | "en_attente_validation"
        | "vendu_validee"
        | "vendu_annulee"
        | "expertise"
      car_type_t: "loueur" | "entreprise" | "particulier"
      carburant_t:
        | "essence"
        | "diesel"
        | "hybride"
        | "electrique"
        | "essence_hybride"
        | "diesel_hybride"
      delivery_status_t: "non_livre" | "livre"
      expert_assignment_status_t:
        | "non_assigne"
        | "en_inspection"
        | "rapport_recu"
      notif_type_t:
        | "outbid"
        | "won"
        | "lost"
        | "ending_soon"
        | "caution"
        | "system"
      offer_status_t: "active" | "winning" | "rejected"
      payment_status_t: "non_paye" | "paye"
      procuration_t: "procuration" | "carton_ouvert" | "carton_ferme"
      transmission_t: "manuelle" | "automatique"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["acheteur", "vendeur", "expert", "admin"],
      auction_status_t: [
        "scheduled",
        "live",
        "closed",
        "validated",
        "cancelled",
      ],
      auction_type_t: ["ouverte", "fermee"],
      auction_visibility_t: ["ouvert", "ferme"],
      car_status: [
        "open",
        "en_cours",
        "en_attente_validation",
        "vendu_validee",
        "vendu_annulee",
        "expertise",
      ],
      car_type_t: ["loueur", "entreprise", "particulier"],
      carburant_t: [
        "essence",
        "diesel",
        "hybride",
        "electrique",
        "essence_hybride",
        "diesel_hybride",
      ],
      delivery_status_t: ["non_livre", "livre"],
      expert_assignment_status_t: [
        "non_assigne",
        "en_inspection",
        "rapport_recu",
      ],
      notif_type_t: [
        "outbid",
        "won",
        "lost",
        "ending_soon",
        "caution",
        "system",
      ],
      offer_status_t: ["active", "winning", "rejected"],
      payment_status_t: ["non_paye", "paye"],
      procuration_t: ["procuration", "carton_ouvert", "carton_ferme"],
      transmission_t: ["manuelle", "automatique"],
    },
  },
} as const

