/** Param lists for every navigator in the app — see architecture plan §4. */

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { code?: string; access_token?: string; refresh_token?: string } | undefined;
  PendingActivation: undefined;
};

export type AcheteurHomeStackParamList = {
  AuctionsList: undefined;
  AuctionDetail: { auctionId: string };
};

export type AcheteurMyBidsStackParamList = {
  MesEncheres: undefined;
  AuctionDetail: { auctionId: string };
};

export type AcheteurWonStackParamList = {
  Gagnees: undefined;
  WonAuctionDetail: { auctionId: string };
  UploadPaymentProof: { auctionId: string };
};

export type AcheteurPaymentsStackParamList = {
  Caution: undefined;
  CautionPaiement: undefined;
  Paiements: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  ChangePassword: undefined;
  Notifications: undefined;
  Support: undefined;
};

export type AcheteurTabParamList = {
  HomeTab: undefined;
  MyBidsTab: undefined;
  WonTab: undefined;
  PaymentsTab: undefined;
  ProfileTab: undefined;
};

export type VendeurDashboardStackParamList = {
  Dashboard: undefined;
};

export type VendeurVehiclesStackParamList = {
  MesVehicules: undefined;
  VehicleDetail: { carId: string };
};

export type VendeurAuctionsStackParamList = {
  MesEncheresLive: undefined;
  Historique: undefined;
};

export type VendeurPayoutsStackParamList = {
  Paiements: undefined;
};

export type VendeurTabParamList = {
  DashboardTab: undefined;
  VehiclesTab: undefined;
  AuctionsTab: undefined;
  PayoutsTab: undefined;
  ProfileTab: undefined;
};
