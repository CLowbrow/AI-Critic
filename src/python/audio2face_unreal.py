#!/usr/bin/env python3
"""
Audio2Face to Unreal MetaHuman Animation Generator

This module processes WAV files through Audio2Face and generates Unreal Engine
animation assets for MetaHuman characters.

Usage:
    python audio2face_unreal.py workspace/wavtest_2025-08-10T07-08-53
    python audio2face_unreal.py workspace/wavtest_2025-08-10T07-08-53/audio/01_elena.wav --single

Requirements:
    - NVIDIA ACE SDK (nvidia_ace wheel)
    - Audio2Face service running on 0.0.0.0:52000
    - USD library for export
"""

import os
import sys
import argparse
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import asyncio

# Check for required dependencies
try:
    import grpc
    import yaml
    import numpy as np
    from pxr import Usd, UsdSkel, UsdGeom, Sdf, Vt  # USD library
except ImportError as e:
    print(f"Missing required dependency: {e}")
    print("Install with: pip install grpcio pyyaml numpy usd-core")
    sys.exit(1)

# Try to import NVIDIA ACE SDK
try:
    import nvidia_ace.audio.v1_pb2 as audio_pb2
    import nvidia_ace.controller.v1_pb2 as controller_pb2
    import nvidia_ace.a2f.v1_pb2 as a2f_pb2
    import nvidia_ace.services.a2f_controller.v1_pb2_grpc as a2f_grpc
    NVIDIA_SDK_AVAILABLE = True
    print("✅ NVIDIA ACE SDK available")
except ImportError:
    NVIDIA_SDK_AVAILABLE = False
    print("⚠️  NVIDIA ACE SDK not found - install nvidia_ace wheel for best results")

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class Audio2FaceUnrealProcessor:
    """Processes WAV files through Audio2Face and generates Unreal animation assets."""
    
    def __init__(self, audio2face_url: str = "0.0.0.0:52000", timeout: int = 180):
        self.audio2face_url = audio2face_url
        self.timeout = timeout  # 3 minutes timeout for Audio2Face processing
        self.channel = None
        self.stub = None
        
    async def connect_to_audio2face(self) -> bool:
        """Connect to Audio2Face gRPC service."""
        try:
            if NVIDIA_SDK_AVAILABLE:
                self.channel = grpc.aio.insecure_channel(self.audio2face_url)
                self.stub = a2f_grpc.A2FControllerServiceStub(self.channel)
                logger.info(f"Connected to Audio2Face at {self.audio2face_url}")
                return True
            else:
                logger.error("NVIDIA ACE SDK required for Audio2Face connection")
                return False
        except Exception as e:
            logger.error(f"Failed to connect to Audio2Face: {e}")
            return False
    
    async def process_workspace(self, workspace_path: Path, options: Dict[str, Any] = None) -> List[Path]:
        """
        Process all WAV files in a workspace.
        
        Args:
            workspace_path: Path to workspace containing audio/ directory
            options: Processing options
            
        Returns:
            List of generated asset file paths
        """
        if options is None:
            options = {}
            
        audio_dir = workspace_path / 'audio'
        if not audio_dir.exists():
            raise ValueError(f"Audio directory not found: {audio_dir}")
        
        # Find all WAV files
        wav_files = list(audio_dir.glob('*.wav'))
        if not wav_files:
            raise ValueError(f"No WAV files found in {audio_dir}")
        
        wav_files.sort()  # Ensure consistent order
        logger.info(f"Found {len(wav_files)} WAV files to process")
        
        # Create export directory
        export_dir = workspace_path / 'unreal_assets'
        export_dir.mkdir(exist_ok=True)
        
        # Process each file
        generated_assets = []
        for i, wav_file in enumerate(wav_files, 1):
            logger.info(f"Processing {i}/{len(wav_files)}: {wav_file.name}")
            
            try:
                if NVIDIA_SDK_AVAILABLE:
                    # Process with official NVIDIA SDK
                    animation_data = await self._process_with_nvidia_sdk(wav_file, options)
                else:
                    # Fallback to custom processing
                    animation_data = await self._process_with_custom_grpc(wav_file, options)
                
                # Generate animation assets
                asset_files = await self._generate_animation_assets(
                    animation_data, wav_file.stem, export_dir, options
                )
                generated_assets.extend(asset_files)
                
            except Exception as e:
                logger.error(f"Failed to process {wav_file.name}: {e}")
        
        logger.info(f"✅ Generated {len(generated_assets)} animation assets")
        return generated_assets
    
    async def process_single_file(self, wav_file: Path, options: Dict[str, Any] = None) -> List[Path]:
        """
        Process a single WAV file.
        
        Args:
            wav_file: Path to the WAV file to process
            options: Processing options
            
        Returns:
            List of generated asset file paths
        """
        if options is None:
            options = {}
            
        if not wav_file.exists() or wav_file.suffix != '.wav':
            raise ValueError(f"Invalid WAV file: {wav_file}")
        
        # Determine workspace and export directory
        workspace_path = wav_file.parent.parent  # Assume file is in workspace/audio/
        export_dir = workspace_path / 'unreal_assets'
        export_dir.mkdir(exist_ok=True)
        
        logger.info(f"Processing single file: {wav_file.name}")
        
        try:
            if NVIDIA_SDK_AVAILABLE:
                # Process with official NVIDIA SDK
                animation_data = await self._process_with_nvidia_sdk(wav_file, options)
            else:
                # Fallback to custom processing
                animation_data = await self._process_with_custom_grpc(wav_file, options)
            
            # Generate animation assets
            asset_files = await self._generate_animation_assets(
                animation_data, wav_file.stem, export_dir, options
            )
            
            logger.info(f"✅ Generated {len(asset_files)} animation assets for {wav_file.name}")
            return asset_files
            
        except Exception as e:
            logger.error(f"Failed to process {wav_file.name}: {e}")
            raise
    
    async def _process_with_nvidia_sdk(self, wav_file: Path, options: Dict[str, Any]) -> Dict[str, Any]:
        """Process audio file using official NVIDIA ACE SDK."""
        logger.info("Using NVIDIA ACE SDK for processing")
        
        # Load audio data
        audio_data = wav_file.read_bytes()
        
        # Create request stream
        requests = []
        
        # Audio header
        audio_header = audio_pb2.AudioHeader(
            audio_format=audio_pb2.AudioHeader.AUDIO_FORMAT_PCM,
            channel_count=1,
            samples_per_second=16000,  # ElevenLabs PCM 16kHz
            bits_per_sample=16
        )
        
        # Stream header with MetaHuman-optimized settings
        face_params = a2f_pb2.FaceParameters()
        face_params.float_params.update({
            'upperFaceStrength': 1.0,
            'lowerFaceStrength': 1.2,
            'faceMaskLevel': 0.6,
            'skinStrength': 1.0,
            'eyelidOpenOffset': 0.06,
            'lipOpenOffset': -0.02
        })
        
        header = controller_pb2.AudioStreamHeader(
            audio_header=audio_header,
            face_params=face_params
        )
        
        # Add header to stream
        stream_msg = controller_pb2.AudioStream(audio_stream_header=header)
        requests.append(stream_msg)
        
        # Add audio data in chunks
        chunk_size = 4096
        for i in range(0, len(audio_data), chunk_size):
            chunk = audio_data[i:i + chunk_size]
            audio_emotion = a2f_pb2.AudioWithEmotion(audio_buffer=chunk)
            stream_msg = controller_pb2.AudioStream(audio_with_emotion=audio_emotion)
            requests.append(stream_msg)
        
        # End of audio
        end_msg = controller_pb2.AudioStream(
            end_of_audio=controller_pb2.AudioStream.EndOfAudio()
        )
        requests.append(end_msg)
        
        # Process stream and collect animation data
        animation_frames = []
        
        try:
            response_stream = self.stub.ProcessAudioStream(iter(requests), timeout=self.timeout)
            async for response in response_stream:
                if response.HasField('animation_data'):
                    
                    # Extract blendshape data from skel_animation
                    blendshape_weights = []
                    time_code = 0
                    
                    if hasattr(response.animation_data, 'skel_animation'):
                        skel_animation = response.animation_data.skel_animation
                        if hasattr(skel_animation, 'blend_shape_weights'):
                            blend_shape_weights_list = skel_animation.blend_shape_weights
                            
                            # Extract data from the first blend_shape_weights entry (should contain all blendshapes)
                            if len(blend_shape_weights_list) > 0:
                                blend_shape_weights = blend_shape_weights_list[0]
                                
                                # Extract time code from first entry
                                time_code = getattr(blend_shape_weights, 'time_code', 0)
                                
                                # Extract ALL values from this entry (contains all blendshape weights)
                                if hasattr(blend_shape_weights, 'values'):
                                    blendshape_weights = list(blend_shape_weights.values)
                                    logger.debug(f"Extracted {len(blendshape_weights)} blendshape weights, time={time_code}")
                                else:
                                    logger.warning("No 'values' field in blend_shape_weights")
                                    logger.debug(f"Available fields: {[field.name for field in blend_shape_weights.DESCRIPTOR.fields] if hasattr(blend_shape_weights, 'DESCRIPTOR') else 'No DESCRIPTOR'}")
                            else:
                                logger.warning("blend_shape_weights list is empty")
                        else:
                            logger.warning("No 'blend_shape_weights' field in skel_animation")
                    else:
                        logger.warning("No 'skel_animation' field in animation_data")
                    
                    frame_data = {
                        'time_code': time_code,
                        'blendshape_weights': blendshape_weights
                    }
                    animation_frames.append(frame_data)
                    if len(animation_frames) % 100 == 0:  # Log every 100th frame to avoid spam
                        logger.info(f"Processed {len(animation_frames)} frames, latest time={time_code}, {len(blendshape_weights)} blendshapes")
                    
        except grpc.aio.AioRpcError as e:
            logger.error(f"gRPC error during processing: {e}")
            raise
        
        return {
            'source_file': str(wav_file),
            'frames': animation_frames,
            'duration': max(f['time_code'] for f in animation_frames) if animation_frames else 0,
            'frame_count': len(animation_frames)
        }
    
    async def _process_with_custom_grpc(self, wav_file: Path, options: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback processing without NVIDIA SDK."""
        logger.info("Using custom gRPC processing (install nvidia_ace for better results)")
        
        # This would implement the custom gRPC logic similar to our JavaScript version
        # For now, return mock data structure
        return {
            'source_file': str(wav_file),
            'frames': [],
            'duration': 0,
            'frame_count': 0,
            'warning': 'Custom gRPC not implemented - install nvidia_ace SDK'
        }
    
    async def _generate_animation_assets(
        self, 
        animation_data: Dict[str, Any], 
        base_name: str, 
        export_dir: Path, 
        options: Dict[str, Any]
    ) -> List[Path]:
        """Generate Unreal animation assets from animation data."""
        generated_files = []
        
        # Generate USD file for Unreal import
        usd_file = await self._export_as_usd(animation_data, base_name, export_dir, options)
        if usd_file:
            generated_files.append(usd_file)
        
        # Generate JSON data for custom workflows
        json_file = await self._export_as_json(animation_data, base_name, export_dir, options)
        if json_file:
            generated_files.append(json_file)
        
        # Generate metadata file
        meta_file = await self._export_metadata(animation_data, base_name, export_dir, options)
        if meta_file:
            generated_files.append(meta_file)
        
        return generated_files
    
    async def _export_as_usd(
        self, 
        animation_data: Dict[str, Any], 
        base_name: str, 
        export_dir: Path, 
        options: Dict[str, Any]
    ) -> Optional[Path]:
        """Export animation data as USD file for Unreal Engine."""
        try:
            usd_path = export_dir / f"{base_name}_animation.usd"
            
            # Create USD stage
            stage = Usd.Stage.CreateNew(str(usd_path))
            
            # Set up the scene
            UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.z)  # Unreal uses Z-up
            
            # Create animation data
            skel_root = UsdSkel.Root.Define(stage, '/SkelRoot')
            skel = UsdSkel.Skeleton.Define(stage, '/SkelRoot/Skeleton')
            
            # Add blendshape animation
            if animation_data['frames']:
                frames = animation_data['frames']
                time_samples = [f['time_code'] for f in frames]
                blendshape_data = [f['blendshape_weights'] for f in frames]
                
                # Create custom blendshape weights attribute for MetaHuman compatibility
                weights_attr = skel.GetPrim().CreateAttribute(
                    'blendShapeWeights', 
                    Sdf.ValueTypeNames.FloatArray, 
                    False  # Not custom
                )
                
                for i, (time, weights) in enumerate(zip(time_samples, blendshape_data)):
                    # Convert time to USD time code (assuming 30fps)
                    usd_time = time * 30  
                    if weights:  # Only set if we have actual weights
                        weights_attr.Set(Vt.FloatArray(weights), usd_time)
            
            # Save the stage
            stage.Save()
            logger.info(f"✅ Generated USD file: {usd_path.name}")
            return usd_path
            
        except Exception as e:
            logger.error(f"Failed to export USD: {e}")
            return None
    
    async def _export_as_json(
        self, 
        animation_data: Dict[str, Any], 
        base_name: str, 
        export_dir: Path, 
        options: Dict[str, Any]
    ) -> Optional[Path]:
        """Export animation data as JSON for custom workflows."""
        try:
            json_path = export_dir / f"{base_name}_animation.json"
            
            export_data = {
                'name': base_name,
                'source_file': animation_data['source_file'],
                'duration': animation_data['duration'],
                'frame_count': animation_data['frame_count'],
                'frames': animation_data['frames'],
                'export_timestamp': str(Path().cwd() / 'timestamp'),
                'format_version': '1.0'
            }
            
            with open(json_path, 'w') as f:
                json.dump(export_data, f, indent=2)
            
            logger.info(f"✅ Generated JSON file: {json_path.name}")
            return json_path
            
        except Exception as e:
            logger.error(f"Failed to export JSON: {e}")
            return None
    
    async def _export_metadata(
        self, 
        animation_data: Dict[str, Any], 
        base_name: str, 
        export_dir: Path, 
        options: Dict[str, Any]
    ) -> Optional[Path]:
        """Export metadata about the animation."""
        try:
            meta_path = export_dir / f"{base_name}_metadata.json"
            
            metadata = {
                'animation_name': base_name,
                'source_audio': Path(animation_data['source_file']).name,
                'duration_seconds': animation_data['duration'],
                'frame_count': animation_data['frame_count'],
                'frame_rate': animation_data['frame_count'] / animation_data['duration'] if animation_data['duration'] > 0 else 0,
                'blendshape_count': len(animation_data['frames'][0]['blendshape_weights']) if animation_data['frames'] else 0,
                'export_info': {
                    'usd_file': f"{base_name}_animation.usd",
                    'json_file': f"{base_name}_animation.json",
                    'recommended_workflow': "Import USD into Unreal or use JSON with custom Python script",
                    'metahuman_compatible': True
                }
            }
            
            with open(meta_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"✅ Generated metadata: {meta_path.name}")
            return meta_path
            
        except Exception as e:
            logger.error(f"Failed to export metadata: {e}")
            return None
    
    async def close(self):
        """Close gRPC connection."""
        if self.channel:
            await self.channel.close()


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Process WAV files through Audio2Face for Unreal MetaHuman')
    parser.add_argument('input_path', help='Workspace path or single WAV file')
    parser.add_argument('--single', action='store_true', help='Process single file instead of workspace')
    parser.add_argument('--audio2face-url', default='0.0.0.0:52000', help='Audio2Face gRPC service URL')
    parser.add_argument('--timeout', type=int, default=180, help='Timeout in seconds for Audio2Face processing (default: 180)')
    parser.add_argument('--config', help='YAML config file for Audio2Face settings')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Validate input path
    input_path = Path(args.input_path)
    if not input_path.exists():
        print(f"❌ Input path does not exist: {input_path}")
        sys.exit(1)
    
    # Create processor
    processor = Audio2FaceUnrealProcessor(args.audio2face_url, args.timeout)
    
    try:
        # Connect to Audio2Face
        if not await processor.connect_to_audio2face():
            print("❌ Failed to connect to Audio2Face service")
            sys.exit(1)
        
        options = {}
        if args.config and Path(args.config).exists():
            with open(args.config) as f:
                options = yaml.safe_load(f)
        
        # Process files
        if args.single or input_path.suffix == '.wav':
            # Process single file
            if input_path.suffix != '.wav':
                print(f"❌ Single file must be a WAV file: {input_path}")
                sys.exit(1)
            
            generated_assets = await processor.process_single_file(input_path, options)
        else:
            # Process workspace
            generated_assets = await processor.process_workspace(input_path, options)
        
        # Print results
        print(f"\n✅ Processing complete!")
        print(f"📁 Generated {len(generated_assets)} animation assets:")
        for asset in generated_assets:
            print(f"  • {asset}")
        
        print(f"\n🎯 Next steps:")
        print(f"  1. Import USD files into Unreal Engine")
        print(f"  2. Apply animations to MetaHuman characters")
        print(f"  3. Use Unreal's Movie Render Queue for video generation")
        
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        sys.exit(1)
    finally:
        await processor.close()


if __name__ == '__main__':
    asyncio.run(main())