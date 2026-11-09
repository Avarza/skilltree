internal import Expo

/// Scene-based life cycle (required by iOS 27). Expo's base class creates the window, starts
/// React Native from the app delegate's factory and forwards URL / user-activity events.
class SceneDelegate: ExpoAppSceneDelegate {}
