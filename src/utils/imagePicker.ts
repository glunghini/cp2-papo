import * as ImagePicker from 'expo-image-picker';

export type ImageSource = 'library' | 'camera';

export type PickImageResult =
  | { status: 'picked'; uri: string }
  | { status: 'cancelled' }
  | { status: 'denied' };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.6,
};

export async function pickImage(source: ImageSource): Promise<PickImageResult> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return { status: 'denied' };
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

  const asset = result.assets?.[0];
  if (result.canceled || !asset) {
    return { status: 'cancelled' };
  }
  return { status: 'picked', uri: asset.uri };
}
