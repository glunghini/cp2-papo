export type PublicUser = {
  uid: string;
  name: string;
  photoUrl: string;
  createdAt: number;
};

export type UserPrivateData = {
  email: string;
  phoneNumber: string;
  birthDate: string; // AAAA-MM-DD
};

export type ChatUser = PublicUser & UserPrivateData;

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  photoUri: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterResult = {
  photoUploadFailed: boolean;
};
