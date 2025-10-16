<template>
  <div class="training-component">
    <!-- 源文件夹选择区域 -->
    <el-card class="parameter-section">
      <template #header>
        <div class="card-header">
          <h5>
            <el-icon><FolderOpened /></el-icon>
            源文件夹选择区域
          </h5>
        </div>
      </template>
      
      <div class="source-folder-selector">
        <p style="margin-bottom: 16px;">选择一个Colmap处理过的点云文件进行训练:</p>

        <div v-if="loadingFolders" v-loading="loadingFolders" class="text-center" style="padding: 40px 0; min-height: 120px;">
          <p>加载可用文件夹...</p>
        </div>

        <el-empty v-else-if="folders.length === 0" description="没有可用的文件夹">
          <template #image>
            <el-icon size="60"><FolderOpened /></el-icon>
          </template>
          <template #description>
            <p>Process images in the Point Cloud Processing tab first</p>
          </template>
        </el-empty>

        <div v-else class="folder-list">
          <el-card
            v-for="folder in folders"
            :key="folder.folder_name || folder.name"
            class="folder-item"
            :class="{ 'active': selectedFolder === (folder.folder_name || folder.name) }"
            @click="selectFolder(folder)"
            shadow="hover"
            style="margin-bottom: 12px; cursor: pointer;"
          >
            <div style="display: flex; align-items: center;">
              <div class="folder-icon" style="margin-right: 12px;">
                <el-icon size="24"><Folder /></el-icon>
              </div>
              <div class="folder-info">
                <div class="folder-name" style="font-weight: 500; margin-bottom: 4px;">
                  {{ folder.folder_name || folder.name }}
                </div>
                <div class="folder-details" style="color: #909399; font-size: 12px;">
                  <el-icon><Box /></el-icon>
                  Processed on {{ formatDate(folder.timestamp || folder.created_time) }}
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </el-card>

    <!-- 训练参数配置区域 -->
    <el-card class="parameter-section" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <h5>
            <el-icon><Setting /></el-icon>
            Training Parameters
          </h5>
        </div>
      </template>

      <!-- 基本参数 -->
      <el-card class="parameter-group">
        <template #header>
          <h6>Basic Parameters</h6>
        </template>

        <el-row :gutter="20" class="parameter-row">
          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  Iterations
                  <el-tooltip content="Number of total iterations to train for" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input-number
                v-model="trainingParams.iterations"
                :min="1000"
                :max="100000"
                style="width: 100%;"
              />
              <div class="parameter-description">默认值: 30,000</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  分辨率缩放
                  <el-tooltip content="Specifies resolution of the loaded images before training" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-select v-model="trainingParams.resolution" style="width: 100%;">
                <el-option label="自动 (默认值)" value="-1" />
                <el-option label="Original size" value="1" />
                <el-option label="1/2 resolution" value="2" />
                <el-option label="1/4 resolution" value="4" />
                <el-option label="1/8 resolution" value="8" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" class="parameter-row">
          <el-col :span="12">
            <el-form-item>
              <el-checkbox v-model="trainingParams.white_background">
                White Background
              </el-checkbox>
              <div class="parameter-description">Use white background instead of black (default)</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  SH Degree
                  <el-tooltip content="球鞋函数的阶数 (不超过 3)" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-select v-model="trainingParams.sh_degree" style="width: 100%;">
                <el-option label="0 - Lambertian" :value="0" />
                <el-option label="1 - Simple directional" :value="1" />
                <el-option label="2 - More detailed" :value="2" />
                <el-option label="3 - Full detail (default)" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" class="parameter-row">
          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  数据加载设备
                  <el-tooltip content="Specifies where to put the source image data" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-select v-model="trainingParams.data_device" style="width: 100%;">
                <el-option label="CUDA (默认)" value="cuda" />
                <el-option label="CPU (减少显存的占用)" value="cpu" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item>
              <el-checkbox v-model="trainingParams.eval">
                Use Evaluation Split
              </el-checkbox>
              <div class="parameter-description">Use a MipNeRF360-style training/test split for evaluation</div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 学习率参数 -->
      <div class="parameter-group" style="margin-top: 24px;">
        <h6 style="margin-bottom: 16px;">学习率参数</h6>

        <el-row :gutter="20" class="parameter-row">
          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  位置学习率参数 (初始值)
                  <el-tooltip content="Initial 3D position learning rate" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <div style="display: flex; align-items: center;">
                <el-slider
                  v-model="trainingParams.position_lr_init"
                  :min="0.00001"
                  :max="0.001"
                  :step="0.00001"
                  style="flex: 1; margin-right: 12px;"
                />
                <span class="range-value">{{ trainingParams.position_lr_init }}</span>
              </div>
              <div class="parameter-description">默认值: 0.00016</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  位置学习率参数 (最终值)
                  <el-tooltip content="Final 3D position learning rate" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <div style="display: flex; align-items: center;">
                <el-slider
                  v-model="trainingParams.position_lr_final"
                  :min="0.0000001"
                  :max="0.00001"
                  :step="0.0000001"
                  style="flex: 1; margin-right: 12px;"
                />
                <span class="range-value">{{ trainingParams.position_lr_final }}</span>
              </div>
              <div class="parameter-description">默认值: 0.0000016</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" class="parameter-row">
          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  Feature Learning Rate
                  <el-tooltip content="Spherical harmonics features learning rate" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <div style="display: flex; align-items: center;">
                <el-slider
                  v-model="trainingParams.feature_lr"
                  :min="0.0001"
                  :max="0.01"
                  :step="0.0001"
                  style="flex: 1; margin-right: 12px;"
                />
                <span class="range-value">{{ trainingParams.feature_lr }}</span>
              </div>
              <div class="parameter-description">默认值: 0.0025</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  不透明度学习率
                  <el-tooltip content="Opacity learning rate" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <div style="display: flex; align-items: center;">
                <el-slider
                  v-model="trainingParams.opacity_lr"
                  :min="0.001"
                  :max="0.1"
                  :step="0.001"
                  style="flex: 1; margin-right: 12px;"
                />
                <span class="range-value">{{ trainingParams.opacity_lr }}</span>
              </div>
              <div class="parameter-description">默认值: 0.05</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" class="parameter-row">
          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  Scaling 学习率
                  <el-tooltip content="Scaling learning rate" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <div style="display: flex; align-items: center;">
                <el-slider
                  v-model="trainingParams.scaling_lr"
                  :min="0.0001"
                  :max="0.01"
                  :step="0.0001"
                  style="flex: 1; margin-right: 12px;"
                />
                <span class="range-value">{{ trainingParams.scaling_lr }}</span>
              </div>
              <div class="parameter-description">默认值: 0.005</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  旋转学习率
                  <el-tooltip content="Rotation learning rate" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <div style="display: flex; align-items: center;">
                <el-slider
                  v-model="trainingParams.rotation_lr"
                  :min="0.0001"
                  :max="0.01"
                  :step="0.0001"
                  style="flex: 1; margin-right: 12px;"
                />
                <span class="range-value">{{ trainingParams.rotation_lr }}</span>
              </div>
              <div class="parameter-description">默认值: 0.001</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" class="parameter-row">
          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  Position LR Delay Multiplier
                  <el-tooltip content="Position learning rate multiplier (cf. Plenoxels)" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <div style="display: flex; align-items: center;">
                <el-slider
                  v-model="trainingParams.position_lr_delay_mult"
                  :min="0.001"
                  :max="0.1"
                  :step="0.001"
                  style="flex: 1; margin-right: 12px;"
                />
                <span class="range-value">{{ trainingParams.position_lr_delay_mult }}</span>
              </div>
              <div class="parameter-description">默认值: 0.01</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  Position LR Max Steps
                  <el-tooltip content="Number of steps where position learning rate goes from initial to final" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input-number
                v-model="trainingParams.position_lr_max_steps"
                :min="1000"
                :max="100000"
                style="width: 100%;"
              />
              <div class="parameter-description">默认值: 30,000</div>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 密度化参数 -->
      <el-card class="parameter-group">
        <template #header>
          <h6>密集化参数</h6>
        </template>

        <el-row :gutter="20" class="parameter-row">
          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  Densify From Iteration
                  <el-tooltip content="Iteration where densification starts" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input-number
                v-model="trainingParams.densify_from_iter"
                :min="0"
                :max="10000"
                style="width: 100%;"
              />
              <div class="parameter-description">默认值: 500</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  密集化停止迭代轮数
                  <el-tooltip content="Iteration where densification stops" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input-number
                v-model="trainingParams.densify_until_iter"
                :min="1000"
                :max="30000"
                style="width: 100%;"
              />
              <div class="parameter-description">默认值: 15,000</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" class="parameter-row">
          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  密集化间隔
                  <el-tooltip content="How frequently to densify (iterations)" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input-number
                v-model="trainingParams.densification_interval"
                :min="10"
                :max="1000"
                style="width: 100%;"
              />
              <div class="parameter-description">默认值: 100</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  不透明度重置间隔
                  <el-tooltip content="How frequently to reset opacity (iterations)" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input-number
                v-model="trainingParams.opacity_reset_interval"
                :min="100"
                :max="10000"
                style="width: 100%;"
              />
              <div class="parameter-description">默认值: 3,000</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" class="parameter-row">
          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  密集化梯度阈值
                  <el-tooltip content="Limit that decides if points should be densified based on 2D position gradient" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <div style="display: flex; align-items: center;">
                <el-slider
                  v-model="trainingParams.densify_grad_threshold"
                  :min="0.00001"
                  :max="0.001"
                  :step="0.00001"
                  style="flex: 1; margin-right: 12px;"
                />
                <span class="range-value">{{ trainingParams.densify_grad_threshold }}</span>
              </div>
              <div class="parameter-description">默认值: 0.0002</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  密集化百分比
                  <el-tooltip content="Percentage of scene extent a point must exceed to be forcibly densified" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <div style="display: flex; align-items: center;">
                <el-slider
                  v-model="trainingParams.percent_dense"
                  :min="0.001"
                  :max="0.1"
                  :step="0.001"
                  style="flex: 1; margin-right: 12px;"
                />
                <span class="range-value">{{ trainingParams.percent_dense }}</span>
              </div>
              <div class="parameter-description">默认值: 0.01</div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 其他参数 -->
      <el-card class="parameter-group">
        <template #header>
          <h6>其他参数</h6>
        </template>

        <el-row :gutter="20" class="parameter-row">
          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  Lambda DSSIM
                  <el-tooltip content="Influence of SSIM on total loss from 0 to 1" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <div style="display: flex; align-items: center;">
                <el-slider
                  v-model="trainingParams.lambda_dssim"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  style="flex: 1; margin-right: 12px;"
                />
                <span class="range-value">{{ trainingParams.lambda_dssim }}</span>
              </div>
              <div class="parameter-description">默认值 0.2</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  测试迭代
                  <el-tooltip content="Iterations at which to compute L1 and PSNR over test set" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input
                v-model="testIterationsInput"
                placeholder="e.g., 7000 30000"
              />
              <div class="parameter-description">默认值: 7000 30000</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" class="parameter-row">
          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  保存迭代次数
                  <el-tooltip content="Iterations at which to save the Gaussian model" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input
                v-model="saveIterationsInput"
                placeholder="e.g., 7000 30000"
              />
              <div class="parameter-description">默认值: 7000 30000</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item>
              <template #label>
                <span>
                  检查点迭代次数
                  <el-tooltip content="Iterations at which to store a checkpoint for continuing later" placement="top">
                    <el-icon><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
              </template>
              <el-input
                v-model="checkpointIterationsInput"
                placeholder="e.g., 5000 15000 25000"
              />
              <div class="parameter-description">可选，空格分隔的值</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20" class="parameter-row">
          <el-col :span="12">
            <el-form-item>
              <el-checkbox v-model="trainingParams.quiet">
                安静模式
              </el-checkbox>
              <div class="parameter-description">忽略任何写入标准输出的文本</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item>
              <el-checkbox v-model="trainingParams.debug">
                调试模式
              </el-checkbox>
              <div class="parameter-description">如果遇到错误，启用调试模式</div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

    </el-card>
    <!-- 训练控制区域 -->
    <el-card class="parameter-section">
      <template #header>
        <h5>
          <el-icon><VideoPlay /></el-icon>
          训练控制模块
        </h5>
      </template>

      <div v-if="!currentTask || !currentTask.task_id" class="training-actions">
        <el-button
          type="primary"
          size="large"
          @click="startTraining"
          :disabled="!selectedFolder || isProcessing"
          :loading="isProcessing"
          class="control-btn"
        >
          <el-icon v-if="!isProcessing"><VideoPlay /></el-icon>
          {{ isProcessing ? '正在训练' : '开始训练' }}
        </el-button>

        <el-button
          type="default"
          size="large"
          @click="resetParams"
          :disabled="isProcessing"
          class="control-btn"
        >
          <el-icon><RefreshLeft /></el-icon>
          重置默认参数
        </el-button>

        <el-button
          type="warning"
          size="large"
          @click="forceReset"
          title="强制重置所有状态"
          class="control-btn"
        >
          <el-icon><SwitchButton /></el-icon>
          强制重置
        </el-button>
      </div>

      <div v-else class="training-status">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h5 style="margin: 0;">训练: {{ selectedFolder }}</h5>
          <div>
            <el-tag type="primary">{{ currentTask.status }}</el-tag>
          </div>
        </div>

        <el-alert
          :type="currentTask.status === 'processing' || currentTask.status === 'running' ? 'info' : 
                currentTask.status === 'completed' ? 'success' : 
                currentTask.status === 'failed' ? 'error' : 'warning'"
          :title="currentTask.message"
          :closable="false"
          show-icon
        />

        <div v-if="currentTask.status === 'processing' || currentTask.status === 'running'" style="margin-top: 16px;">
          <el-button type="danger" @click="cancelTask" class="control-btn">
            <el-icon><VideoPause /></el-icon>
            取消训练
          </el-button>
        </div>

        <div v-if="currentTask.status === 'completed'" style="margin-top: 16px;" class="action-buttons">
          <el-button type="success" @click="viewResults" class="control-btn" style="margin-right: 8px;">
            <el-icon><View /></el-icon>
            查看结果
          </el-button>
          <el-button type="primary" @click="resetTaskState" class="control-btn">
            <el-icon><Refresh /></el-icon>
            训练其他模型
          </el-button>
        </div>

        <div v-if="currentTask.status === 'failed'" style="margin-top: 16px;">
          <el-alert
            v-if="currentTask.error"
            type="error"
            :title="`错误: ${currentTask.error}`"
            :closable="false"
            style="margin-bottom: 16px;"
          />
          <el-button type="primary" @click="resetTaskState" class="control-btn">
            <el-icon><Refresh /></el-icon>
            再次尝试
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 训练历史记录 -->
    <el-card class="parameter-section">
      <template #header>
        <h5>
          <el-icon><Clock /></el-icon>
          训练历史记录
        </h5>
      </template>

      <div v-if="loadingResults" v-loading="true" style="text-align: center; padding: 40px;">
        <p>加载历史训练...</p>
      </div>

      <el-empty v-else-if="results.length === 0" description="没有找到历史文件夹">
        <el-icon size="64"><Clock /></el-icon>
      </el-empty>

      <el-table v-else :data="results" style="width: 100%">
        <el-table-column prop="folder_name" label="Folder" />
        <el-table-column prop="status" label="Status">
          <template #default="scope">
            <el-tag 
              :type="scope.row.status === 'completed' ? 'success' : 
                    scope.row.status === 'failed' ? 'danger' : 
                    scope.row.status === 'cancelled' ? 'warning' : 'info'"
            >
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="processing_time" label="Training Time">
          <template #default="scope">
            {{ scope.row.processing_time ? formatTime(scope.row.processing_time) : 'N/A' }}
          </template>
        </el-table-column>
        <el-table-column prop="timestamp" label="Trained On">
          <template #default="scope">
            {{ scope.row.timestamp ? formatDate(scope.row.timestamp) : (scope.row.created_time ? formatDate(scope.row.created_time) : 'Unknown') }}
          </template>
        </el-table-column>
        <el-table-column label="Actions">
          <template #default="scope">
            <el-button
              type="danger"
              size="small"
              @click="confirmDeleteResult(scope.row)"
            >
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup name="TrainingComponent">
import { shallowRef, onMounted, onBeforeUnmount } from 'vue';
import { eventBus } from '@/utils/eventBus';
import { useTrainingStore } from '@/stores/trainingStore';
import { useTrainingComponent } from '@/composables/useTrainingComponent';
import { useWebSocketConnection } from '@/composables/useWebSocket';
import { TrainingUtils } from '@/utils/trainingUtils';
import { ElNotification, ElMessage, ElCard, ElTag, } from 'element-plus';
import { Delete, QuestionFilled, VideoPlay, VideoPause, RefreshLeft, 
  SwitchButton, View, Refresh, Clock,FolderOpened,Folder,Box,Setting
} from '@element-plus/icons-vue';

// 使用 composables
const trainingStore = useTrainingStore();
const {
  // 响应式数据
  testIterationsInput,
  saveIterationsInput,
  checkpointIterationsInput,
  
  // 来自 trainingStore 的数据
  folders,
  loadingFolders,
  selectedFolder,
  trainingParams,
  currentTask,
  isProcessing,
  results,
  loadingResults,
  
  // 方法
  resetParams,
  startTraining,
  cancelTask,
  forceReset,
  confirmDeleteResult,
  selectFolder,
  viewResults,
  initializeIterationInputs,
  resetTaskState,
  formatDate,
  formatTime,
  handleVisualizationActivity,
  handlePointCloudProcessed
} = useTrainingComponent();

// WebSocket 连接
const { ws } = useWebSocketConnection();

// 生命周期钩子
onMounted(async () => {
  // 初始化 store
  await trainingStore.initialize();
  
  // 初始化迭代输入框
  initializeIterationInputs();
  
  // 事件监听
  eventBus.on('point-cloud-processed', handlePointCloudProcessed);
  eventBus.on('visualization-active', handleVisualizationActivity);
  
  // 连接WebSocket
  try {
    await ws.connect();
  } catch (error) {
    console.error('WebSocket连接失败:', error);
  }
  
  // 设置WebSocket信息
  trainingStore.setWebsocketInfo('localhost', 6009);
});

onBeforeUnmount(() => {
  // 清理事件监听
  eventBus.off('point-cloud-processed', handlePointCloudProcessed);
  eventBus.off('visualization-active', handleVisualizationActivity);
  
  // 断开WebSocket连接
  ws.disconnect();
});
</script>

<style scoped>
.parameter-section {
  margin-bottom: 24px;
}

.parameter-row {
  margin-bottom: 16px;
}

.parameter-description {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.range-value {
  min-width: 60px;
  text-align: center;
  font-weight: 500;
}

.control-btn {
  margin-right: 12px;
  margin-bottom: 8px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.training-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.folder-item {
  cursor: pointer;
  transition: all 0.3s ease;
}

.folder-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.folder-item.selected {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.folder-icon {
  font-size: 24px;
  color: #409eff;
  margin-bottom: 8px;
}

.folder-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.folder-info {
  font-size: 12px;
  color: #909399;
}
</style>
