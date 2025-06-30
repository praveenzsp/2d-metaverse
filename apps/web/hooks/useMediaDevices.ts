import { useCallback, useEffect, useMemo, useState } from "react";

export default function useMediaDevices(videoRef: React.RefObject<HTMLVideoElement | null>) {
	const [isAudioEnabled, setIsAudioEnabled] = useState(true);
	const [isVideoEnabled, setIsVideoEnabled] = useState(true);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedVideoDevice, setSelectedVideoDevice] = useState<MediaDeviceInfo | null>(null);
	const [selectedAudioDevice, setSelectedAudioDevice] = useState<MediaDeviceInfo | null>(null);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const constraints = useMemo(() => ({
		video: {
			facingMode: 'user',
			width: { ideal: 1280 },
			height: { ideal: 720 },
		},
		audio: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
		},
	}), []);

	// Check permissions for camera and microphone
	const checkPermissions = useCallback(async () => {
		try {
			const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
			const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
			
			return {
				camera: cameraPermission.state === 'granted',
				microphone: microphonePermission.state === 'granted'
			};
		} catch (error) {
			console.error('Permission check failed:', error);
			return { camera: false, microphone: false };
		}
	}, []);

	// Get user media stream with proper error handling
	const getUserStream = useCallback(async (customConstraints?: MediaStreamConstraints) => {
		setIsLoading(true);
		setError(null);
		
		try {
			const permissions = await checkPermissions();
			const constraintsToUse = customConstraints || constraints;
			
			// Check if we have permissions for requested media
			if (constraintsToUse.video && !permissions.camera) {
				throw new Error('Camera permission not granted');
			}
			if (constraintsToUse.audio && !permissions.microphone) {
				throw new Error('Microphone permission not granted');
			}
			
			const userStream = await navigator.mediaDevices.getUserMedia(constraintsToUse);
			return userStream;
		} catch (error) {
			console.error('Failed to get user media:', error);
			let errorMessage = 'Failed to access media devices';
			
			if (error instanceof Error) {
				if (error.name === 'NotAllowedError') {
					errorMessage = 'Permission denied. Please allow camera and microphone access.';
				} else if (error.name === 'NotFoundError') {
					errorMessage = 'No camera or microphone found.';
				} else if (error.name === 'NotReadableError') {
					errorMessage = 'Camera or microphone is already in use by another application.';
				} else {
					errorMessage = error.message;
				}
			}
			
			setError(errorMessage);
			throw error;
		} finally {
			setIsLoading(false);
		}
	}, [constraints, checkPermissions]);

	// Initialize media stream
	useEffect(() => {
		let isMounted = true;
		
		const initializeStream = async () => {
			try {
				if (!isMounted) return;
				
				const userStream = await getUserStream({
					video: isVideoEnabled ? {
						deviceId: selectedVideoDevice?.deviceId ? { exact: selectedVideoDevice.deviceId } : undefined,
						facingMode: 'user',
						width: { ideal: 1280 },
						height: { ideal: 720 },
					} : false,
					audio: isAudioEnabled ? {
						deviceId: selectedAudioDevice?.deviceId ? { exact: selectedAudioDevice.deviceId } : undefined,
						echoCancellation: true,
						noiseSuppression: true,
						autoGainControl: true,
					} : false,
				});
				
				if (!isMounted) {
					// Clean up stream if component unmounted during async operation
					userStream.getTracks().forEach(track => track.stop());
					return;
				}
				
				setStream(userStream);
				
				if (videoRef.current && isMounted) {
					videoRef.current.srcObject = userStream;
					try {
						await videoRef.current.play();
					} catch (playError) {
						// Ignore play errors if component is unmounting
						if (isMounted) {
							console.error('Failed to play video:', playError);
						}
					}
				}
			} catch (error) {
				if (isMounted) {
					console.error('Failed to initialize stream:', error);
				}
			}
		};

		initializeStream();

		// Cleanup function
		return () => {
			isMounted = false;
			if (stream) {
				stream.getTracks().forEach(track => {
					track.stop();
				});
			}
		};
	}, [isVideoEnabled, isAudioEnabled, selectedVideoDevice?.deviceId, selectedAudioDevice?.deviceId]);

	// Fetch available devices
	useEffect(() => {
		const fetchDevices = async () => {
			try {
				const devices = await navigator.mediaDevices.enumerateDevices();
				const videoInputs = devices.filter(device => device.kind === 'videoinput');
				const audioInputs = devices.filter(device => device.kind === 'audioinput');
				
				setVideoDevices(videoInputs);
				setAudioDevices(audioInputs);
				
				// Set initial selected devices if not already set
				if (videoInputs.length > 0 && !selectedVideoDevice) {
					setSelectedVideoDevice(videoInputs[0]);
				}
				if (audioInputs.length > 0 && !selectedAudioDevice) {
					setSelectedAudioDevice(audioInputs[0]);
				}
			} catch (error) {
				console.error('Failed to enumerate devices:', error);
				setError('Failed to get available devices');
			}
		};

		fetchDevices();
	}, []);

	// Save media config to localStorage
	useEffect(() => {
		const mediaConfig = {
			video: isVideoEnabled,
			audio: isAudioEnabled,
		};
		localStorage.setItem('mediaConfig', JSON.stringify(mediaConfig));
	}, [isVideoEnabled, isAudioEnabled]);

	// Handle video toggle using track.enabled instead of track removal
	const handleVideoToggle = useCallback(async () => {
		if (!stream) return;
		const videoTrack = stream.getVideoTracks()[0];
		if (videoTrack) {
			videoTrack.enabled = !videoTrack.enabled;
			setIsVideoEnabled(videoTrack.enabled);
		} else {
			// If no video track exists, create one
			try {
				const newVideoStream = await getUserStream({
					video: {
						deviceId: selectedVideoDevice?.deviceId ? { exact: selectedVideoDevice.deviceId } : undefined,
						facingMode: 'user',
						width: { ideal: 1280 },
						height: { ideal: 720 },
					}
				});
				
				const newVideoTrack = newVideoStream.getVideoTracks()[0];
				stream.addTrack(newVideoTrack);
				setIsVideoEnabled(true);
			} catch (error) {
				console.error('Failed to add video track:', error);
			}
		}
	}, [stream, getUserStream, selectedVideoDevice]);

	// Handle audio toggle using track.enabled instead of track removal
	const handleAudioToggle = useCallback(async () => {
		if (!stream) return;
		
		const audioTrack = stream.getAudioTracks()[0];
		if (audioTrack) {
			audioTrack.enabled = !audioTrack.enabled;
			setIsAudioEnabled(audioTrack.enabled);
		} else {
			// If no audio track exists, create one
			try {
				const newAudioStream = await getUserStream({
					audio: {
						deviceId: selectedAudioDevice?.deviceId ? { exact: selectedAudioDevice.deviceId } : undefined,
						echoCancellation: true,
						noiseSuppression: true,
						autoGainControl: true,
					}
				});
				
				const newAudioTrack = newAudioStream.getAudioTracks()[0];
				stream.addTrack(newAudioTrack);
				setIsAudioEnabled(true);
			} catch (error) {
				console.error('Failed to add audio track:', error);
			}
		}
	}, [stream, getUserStream, selectedAudioDevice]);

	// Handle video device change with proper track replacement
	const handleVideoDeviceChange = useCallback(async (deviceId: string) => {
		const device = videoDevices.find(d => d.deviceId === deviceId);
		if (!device || !stream) return;

		try {
			// Get new video stream with the selected device
			const newVideoStream = await getUserStream({
				video: {
					deviceId: { exact: deviceId },
					facingMode: 'user',
					width: { ideal: 1280 },
					height: { ideal: 720 },
				}
			});

			// Get the new video track
			const newVideoTrack = newVideoStream.getVideoTracks()[0];
			if (!newVideoTrack) {
				throw new Error('No video track found in new stream');
			}

			// Remove old video track
			const oldVideoTrack = stream.getVideoTracks()[0];
			if (oldVideoTrack) {
				stream.removeTrack(oldVideoTrack);
				oldVideoTrack.stop();
			}

			// Add new video track
			stream.addTrack(newVideoTrack);
			
			// Update selected device
			setSelectedVideoDevice(device);
			
			// Update video element if needed
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				await videoRef.current.play();
			}
		} catch (error) {
			console.error('Failed to switch video device:', error);
			setError('Failed to switch video device');
		}
	}, [stream, videoDevices, getUserStream, videoRef]);

	// Handle audio device change with proper track replacement
	const handleAudioDeviceChange = useCallback(async (deviceId: string) => {
		const device = audioDevices.find(d => d.deviceId === deviceId);
		if (!device || !stream) return;

		try {
			// Get new audio stream with the selected device
			const newAudioStream = await getUserStream({
				audio: {
					deviceId: { exact: deviceId },
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				}
			});

			// Get the new audio track
			const newAudioTrack = newAudioStream.getAudioTracks()[0];
			if (!newAudioTrack) {
				throw new Error('No audio track found in new stream');
			}

			// Remove old audio track
			const oldAudioTrack = stream.getAudioTracks()[0];
			if (oldAudioTrack) {
				stream.removeTrack(oldAudioTrack);
				oldAudioTrack.stop();
			}

			// Add new audio track
			stream.addTrack(newAudioTrack);
			
			// Update selected device
			setSelectedAudioDevice(device);
		} catch (error) {
			console.error('Failed to switch audio device:', error);
			setError('Failed to switch audio device');
		}
	}, [stream, audioDevices, getUserStream]);

	// Cleanup function for component unmount
	useEffect(() => {
		return () => {
			if (stream) {
				stream.getTracks().forEach(track => {
					track.stop();
				});
			}
		};
	}, [stream]);

	return {
		isAudioEnabled,
		isVideoEnabled,
		videoDevices,
		audioDevices,
		selectedVideoDevice,
		selectedAudioDevice,
		stream,
		error,
		isLoading,
		handleVideoToggle,
		handleAudioToggle,
		handleVideoDeviceChange,
		handleAudioDeviceChange,
		checkPermissions,
	};
}