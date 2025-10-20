"""
启动带有WebSocket训练控制的训练脚本
"""
import sys
import os

# 添加gs目录到路径
gs_path = os.path.join(os.path.dirname(__file__), 'gs')
sys.path.insert(0, gs_path)

from gs.train import training
from gs.arguments import ModelParams, PipelineParams, OptimizationParams
from argparse import ArgumentParser

if __name__ == "__main__":
    parser = ArgumentParser(description="Training script with WebSocket control")
    lp = ModelParams(parser)
    op = OptimizationParams(parser)
    pp = PipelineParams(parser)
    
    # 添加WebSocket控制参数
    parser.add_argument('--ip', type=str, default="127.0.0.1")
    parser.add_argument('--port', type=int, default=6009)
    parser.add_argument('--ws_port', type=int, default=8765, help="WebSocket训练控制端口")
    parser.add_argument('--enable_ws_control', action='store_true', default=True, help="启用WebSocket训练控制")
    parser.add_argument('--debug_from', type=int, default=-1)
    parser.add_argument('--detect_anomaly', action='store_true', default=False)
    parser.add_argument("--test_iterations", nargs="+", type=int, default=[7_000, 30_000])
    parser.add_argument("--save_iterations", nargs="+", type=int, default=[7_000, 30_000])
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument('--disable_viewer', action='store_true', default=False)
    parser.add_argument("--checkpoint_iterations", nargs="+", type=int, default=[])
    parser.add_argument("--start_checkpoint", type=str, default=None)
    
    args = parser.parse_args()
    args.save_iterations.append(args.iterations)
    
    print("启动带有WebSocket训练控制的3D高斯训练")
    print(f"模型路径: {args.model_path}")
    print(f"WebSocket控制端口: {args.ws_port}")
    
    # 启动训练
    training(
        lp.extract(args), 
        op.extract(args), 
        pp.extract(args), 
        args.test_iterations, 
        args.save_iterations, 
        args.checkpoint_iterations, 
        args.start_checkpoint, 
        args.debug_from,
        args.enable_ws_control,
        args.ws_port
    )
    
    print("\n训练完成")