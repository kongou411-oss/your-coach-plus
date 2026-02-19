import Foundation
import UIKit
import AVFoundation

/// ライブカメラプレビュー管理（Android CameraX相当）
class CameraPreviewManager: NSObject, AVCapturePhotoCaptureDelegate {
    static let shared = CameraPreviewManager()

    private var captureSession: AVCaptureSession?
    private var photoOutput: AVCapturePhotoOutput?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var captureCompletion: ((String?, String?, String?) -> Void)?

    let previewView = UIView()

    private override init() {
        super.init()
    }

    /// カメラプレビュー開始
    func startCamera() {
        guard captureSession == nil else { return }

        // 権限チェック
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        switch status {
        case .authorized:
            setupSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                if granted {
                    DispatchQueue.main.async {
                        self?.setupSession()
                    }
                }
            }
        default:
            break
        }
    }

    private func setupSession() {
        let session = AVCaptureSession()
        session.sessionPreset = .photo

        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: camera) else { return }

        if session.canAddInput(input) {
            session.addInput(input)
        }

        let output = AVCapturePhotoOutput()
        if session.canAddOutput(output) {
            session.addOutput(output)
        }
        self.photoOutput = output

        // iPad対応: プレビュー接続のオリエンテーション設定
        if let connection = output.connection(with: .video) {
            updateOrientation(for: connection)
        }

        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.previewView.layer.sublayers?.removeAll()
            layer.frame = self.previewView.bounds
            self.previewView.layer.addSublayer(layer)
            self.previewLayer = layer

            // iPad対応: プレビューレイヤーの接続オリエンテーション
            if let previewConnection = layer.connection {
                self.updateOrientation(for: previewConnection)
            }
        }

        self.captureSession = session

        DispatchQueue.global(qos: .userInitiated).async {
            session.startRunning()
        }
    }

    /// デバイスの向きに合わせてビデオオリエンテーションを更新
    private func updateOrientation(for connection: AVCaptureConnection) {
        guard connection.isVideoOrientationSupported else { return }
        let deviceOrientation = UIDevice.current.orientation
        switch deviceOrientation {
        case .portrait:
            connection.videoOrientation = .portrait
        case .portraitUpsideDown:
            connection.videoOrientation = .portraitUpsideDown
        case .landscapeLeft:
            connection.videoOrientation = .landscapeRight
        case .landscapeRight:
            connection.videoOrientation = .landscapeLeft
        default:
            connection.videoOrientation = .portrait
        }
    }

    /// プレビューレイヤーのフレーム更新
    func updatePreviewFrame() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.previewLayer?.frame = self.previewView.bounds
            // iPad対応: リサイズ時にオリエンテーション再適用
            if let connection = self.previewLayer?.connection {
                self.updateOrientation(for: connection)
            }
        }
    }

    /// 写真撮影
    func capturePhoto(completion: @escaping (String?, String?, String?) -> Void) {
        guard let photoOutput = self.photoOutput else {
            completion(nil, nil, "カメラが初期化されていません")
            return
        }

        // iPad対応: 撮影時にオリエンテーションを更新
        if let connection = photoOutput.connection(with: .video) {
            updateOrientation(for: connection)
        }

        self.captureCompletion = completion
        let settings = AVCapturePhotoSettings()
        photoOutput.capturePhoto(with: settings, delegate: self)
    }

    /// カメラ停止
    func stopCamera() {
        captureSession?.stopRunning()
        captureSession = nil
        photoOutput = nil
        DispatchQueue.main.async { [weak self] in
            self?.previewLayer?.removeFromSuperlayer()
            self?.previewLayer = nil
        }
    }

    // MARK: - AVCapturePhotoCaptureDelegate

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        if let error = error {
            captureCompletion?(nil, nil, error.localizedDescription)
            captureCompletion = nil
            return
        }

        guard let imageData = photo.fileDataRepresentation(),
              let image = UIImage(data: imageData) else {
            captureCompletion?(nil, nil, "写真の処理に失敗しました")
            captureCompletion = nil
            return
        }

        // リサイズ（最大1024px）
        let maxDimension: CGFloat = 1024
        var finalImage = image
        if max(image.size.width, image.size.height) > maxDimension {
            let scale = maxDimension / max(image.size.width, image.size.height)
            let newSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
            UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
            image.draw(in: CGRect(origin: .zero, size: newSize))
            if let resized = UIGraphicsGetImageFromCurrentImageContext() {
                finalImage = resized
            }
            UIGraphicsEndImageContext()
        }

        guard let jpegData = finalImage.jpegData(compressionQuality: 0.8) else {
            captureCompletion?(nil, nil, "JPEG変換に失敗しました")
            captureCompletion = nil
            return
        }

        let base64 = jpegData.base64EncodedString()
        captureCompletion?(base64, "image/jpeg", nil)
        captureCompletion = nil
    }
}
