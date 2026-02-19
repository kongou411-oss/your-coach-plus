import Foundation
import UIKit
import SwiftUI
import PhotosUI

/// カメラ・フォトピッカー用Swiftブリッジ
/// Kotlin側から呼び出して画像取得
@objc public class CameraBridge: NSObject {

    @objc public static let shared = CameraBridge()

    private override init() {
        super.init()
    }

    // MARK: - Photo Picker (iOS 14+)

    /// フォトピッカーを表示して画像を選択
    /// - Parameters:
    ///   - viewController: 表示元のViewController
    ///   - completion: 完了コールバック (base64ImageData, mimeType, error)
    @objc public func showPhotoPicker(
        presentingViewController viewController: UIViewController,
        completion: @escaping (String?, String?, String?) -> Void
    ) {
        DispatchQueue.main.async {
            var configuration = PHPickerConfiguration()
            configuration.filter = .images
            configuration.selectionLimit = 1

            let picker = PHPickerViewController(configuration: configuration)
            let delegate = PhotoPickerDelegate(completion: completion)
            picker.delegate = delegate

            // Retain delegate
            objc_setAssociatedObject(picker, &AssociatedKeys.delegateKey, delegate, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)

            // iPad対応: ポップオーバー設定
            if let popover = picker.popoverPresentationController {
                popover.sourceView = viewController.view
                popover.sourceRect = CGRect(x: viewController.view.bounds.midX, y: viewController.view.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }

            viewController.present(picker, animated: true)
        }
    }

    // MARK: - Camera Capture

    /// カメラを起動して写真撮影
    /// - Parameters:
    ///   - viewController: 表示元のViewController
    ///   - completion: 完了コールバック (base64ImageData, mimeType, error)
    @objc public func showCamera(
        presentingViewController viewController: UIViewController,
        completion: @escaping (String?, String?, String?) -> Void
    ) {
        DispatchQueue.main.async {
            guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
                completion(nil, nil, "カメラが利用できません")
                return
            }

            let picker = UIImagePickerController()
            picker.sourceType = .camera
            picker.cameraCaptureMode = .photo
            picker.allowsEditing = false
            // iPad対応: カメラはフルスクリーン表示が必須
            picker.modalPresentationStyle = .fullScreen

            let delegate = ImagePickerDelegate(completion: completion)
            picker.delegate = delegate

            // Retain delegate
            objc_setAssociatedObject(picker, &AssociatedKeys.delegateKey, delegate, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)

            viewController.present(picker, animated: true)
        }
    }

    // MARK: - Action Sheet (Camera or Photo Library)

    /// カメラまたはフォトライブラリを選択するアクションシートを表示
    @objc public func showImageSourceSelection(
        presentingViewController viewController: UIViewController,
        completion: @escaping (String?, String?, String?) -> Void
    ) {
        DispatchQueue.main.async {
            let alertController = UIAlertController(
                title: "画像を選択",
                message: nil,
                preferredStyle: .actionSheet
            )

            // カメラオプション
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                alertController.addAction(UIAlertAction(title: "カメラで撮影", style: .default) { _ in
                    self.showCamera(presentingViewController: viewController, completion: completion)
                })
            }

            // フォトライブラリオプション
            alertController.addAction(UIAlertAction(title: "フォトライブラリから選択", style: .default) { _ in
                self.showPhotoPicker(presentingViewController: viewController, completion: completion)
            })

            // キャンセル
            alertController.addAction(UIAlertAction(title: "キャンセル", style: .cancel) { _ in
                completion(nil, nil, "キャンセルされました")
            })

            // iPadでのポップオーバー対応
            if let popover = alertController.popoverPresentationController {
                popover.sourceView = viewController.view
                popover.sourceRect = CGRect(x: viewController.view.bounds.midX, y: viewController.view.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }

            viewController.present(alertController, animated: true)
        }
    }

    // MARK: - Check Permissions

    /// カメラの権限状態を確認
    @objc public func checkCameraPermission(completion: @escaping (Bool) -> Void) {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        switch status {
        case .authorized:
            completion(true)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    completion(granted)
                }
            }
        default:
            completion(false)
        }
    }
}

// MARK: - Associated Keys

private struct AssociatedKeys {
    static var delegateKey = "CameraBridgeDelegateKey"
}

// MARK: - Photo Picker Delegate

private class PhotoPickerDelegate: NSObject, PHPickerViewControllerDelegate {
    let completion: (String?, String?, String?) -> Void

    init(completion: @escaping (String?, String?, String?) -> Void) {
        self.completion = completion
    }

    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        picker.dismiss(animated: true)

        guard let result = results.first else {
            completion(nil, nil, "画像が選択されませんでした")
            return
        }

        result.itemProvider.loadObject(ofClass: UIImage.self) { [weak self] object, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.completion(nil, nil, error.localizedDescription)
                    return
                }

                guard let image = object as? UIImage else {
                    self?.completion(nil, nil, "画像の読み込みに失敗しました")
                    return
                }

                self?.processImage(image)
            }
        }
    }

    private func processImage(_ image: UIImage) {
        // 画像をリサイズ（最大1024px）
        let resizedImage = resizeImage(image, maxSize: 1024)

        // JPEGに変換
        guard let imageData = resizedImage.jpegData(compressionQuality: 0.8) else {
            completion(nil, nil, "画像の変換に失敗しました")
            return
        }

        // Base64エンコード
        let base64String = imageData.base64EncodedString()
        completion(base64String, "image/jpeg", nil)
    }

    private func resizeImage(_ image: UIImage, maxSize: CGFloat) -> UIImage {
        let size = image.size

        if size.width <= maxSize && size.height <= maxSize {
            return image
        }

        let ratio = min(maxSize / size.width, maxSize / size.height)
        let newSize = CGSize(width: size.width * ratio, height: size.height * ratio)

        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resizedImage = UIGraphicsGetImageFromCurrentImageContext() ?? image
        UIGraphicsEndImageContext()

        return resizedImage
    }
}

// MARK: - Image Picker Delegate (Camera)

private class ImagePickerDelegate: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    let completion: (String?, String?, String?) -> Void

    init(completion: @escaping (String?, String?, String?) -> Void) {
        self.completion = completion
    }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        picker.dismiss(animated: true)

        guard let image = info[.originalImage] as? UIImage else {
            completion(nil, nil, "画像の取得に失敗しました")
            return
        }

        processImage(image)
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
        completion(nil, nil, "キャンセルされました")
    }

    private func processImage(_ image: UIImage) {
        // 画像をリサイズ（最大1024px）
        let resizedImage = resizeImage(image, maxSize: 1024)

        // JPEGに変換
        guard let imageData = resizedImage.jpegData(compressionQuality: 0.8) else {
            completion(nil, nil, "画像の変換に失敗しました")
            return
        }

        // Base64エンコード
        let base64String = imageData.base64EncodedString()
        completion(base64String, "image/jpeg", nil)
    }

    private func resizeImage(_ image: UIImage, maxSize: CGFloat) -> UIImage {
        let size = image.size

        if size.width <= maxSize && size.height <= maxSize {
            return image
        }

        let ratio = min(maxSize / size.width, maxSize / size.height)
        let newSize = CGSize(width: size.width * ratio, height: size.height * ratio)

        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resizedImage = UIGraphicsGetImageFromCurrentImageContext() ?? image
        UIGraphicsEndImageContext()

        return resizedImage
    }
}

// MARK: - AVFoundation Import
import AVFoundation
