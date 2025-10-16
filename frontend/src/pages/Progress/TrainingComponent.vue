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
    </div>

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
    </div>

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

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { eventBus } from '@/utils/eventBus';
import { TrainingService } from '@/services/trainingService';
import { TrainingParams } from '@/utils/trainingParams';
import { TrainingUtils } from '@/utils/trainingUtils';
import { ElNotification, ElMessage, ElMessageBox } from 'element-plus';
import { 
  Delete, 
  QuestionFilled, 
  VideoPlay, 
  VideoPause, 
  RefreshLeft, 
  SwitchButton, 
  View, 
  Refresh, 
  Clock 
} from '@element-plus/icons-vue';
import wsClient from '@/utils/WebSocketClient'; 

// 使用 Vuex store 和 router
const store = useStore();
const router = useRouter();

// 响应式数据
const loadingFolders = ref(true);
const loadingResults = ref(true);
const folders = ref([]);
const results = ref([]);
const selectedFolder = ref(null);
const selectedFolderDetails = ref(null);
const taskCheckInterval = ref(null);
const isProcessing = ref(false);
const httpError = ref(null);

// 添加状态监控计时器和计数器
const stateMonitorInterval = ref(null);
const stateChangeCounter = ref(0);
const lastTaskStatus = ref(null);
const lastStateChangeTime = ref(null);

// 用于处理空格分隔的迭代列表
const testIterationsInput = ref("7000 30000");
const saveIterationsInput = ref("7000 30000");
const checkpointIterationsInput = ref("");

// 使用默认训练参数
const trainingParams = reactive(TrainingParams.getDefaultParams());

// 图标
const icons = {
  Delete: shallowRef(Delete),
  QuestionFilled: shallowRef(QuestionFilled),
  VideoPlay: shallowRef(VideoPlay),
  VideoPause: shallowRef(VideoPause),
  RefreshLeft: shallowRef(RefreshLeft),
  SwitchButton: shallowRef(SwitchButton),
  View: shallowRef(View),
  Refresh: shallowRef(Refresh),
  Clock: shallowRef(Clock),
};

// 计算属性
const username = computed(() => store.getters.user?.username);

const currentTask = computed(() => {
  // 从Vuex store获取当前训练任务状态
  return store.getters.trainingCurrentTask || {
    task_id: null,
    status: 'idle', // 'idle', 'running', 'processing', 'completed', 'failed', 'cancelled'
    progress: 0,
    message: '',
    output_logs: [],
    start_time: null,
    end_time: null,
    folder_name: null,
    model_path: null,
    error: null,
  };
});

// 将输入字符串转换为数字数组
const parsedTestIterations = computed(() => parseIterationString(testIterationsInput.value));
const parsedSaveIterations = computed(() => parseIterationString(saveIterationsInput.value));
const parsedCheckpointIterations = computed(() => parseIterationString(checkpointIterationsInput.value));

// 监听器
watch(username, (newUsername, oldUsername) => {
  if (newUsername && newUsername !== oldUsername) {
    console.log(`[TrainingComponent] Username detected: ${newUsername}. Initializing component.`);
    syncAndInitialize();
  }
});

watch(currentTask, (newTask, oldTask) => {
  if (newTask && newTask.task_id && (newTask.status === 'running' || newTask.status === 'processing')) {
    if (!taskCheckInterval.value) {
      startTaskStatusPolling(newTask.task_id);
    }
  } else if (oldTask && oldTask.task_id && (oldTask.status === 'running' || oldTask.status === 'processing')) {
    // If task is no longer running/processing, clear interval
     if (newTask.status === 'completed' || newTask.status === 'failed' || newTask.status === 'cancelled' || !newTask.task_id) {
      clearTaskCheckInterval();
    }
  }
});

// 监听输入变化，更新参数
watch(testIterationsInput, () => {
  trainingParams.test_iterations = parsedTestIterations.value;
});

watch(saveIterationsInput, () => {
  trainingParams.save_iterations = parsedSaveIterations.value;
});

watch(checkpointIterationsInput, () => {
  trainingParams.checkpoint_iterations = parsedCheckpointIterations.value;
});

// 生命周期钩子
onMounted(() => {
  // Initial data fetch if username is already available
  if (username.value) {
    syncAndInitialize();
  } else {
    console.log('[TrainingComponent] Username not available on mount, waiting for it to be set in store.');
  }
  eventBus.on('point-cloud-processed', handlePointCloudProcessed);

  fetchTrainingResults();
  fetchPointCloudFolders();
  
  // 连接WebSocket
  const token = localStorage.getItem('token');
  if(token && !wsClient.isConnected()) {
      // 注意：这里的URL需要与您的后端SocketIO服务器地址一致
      wsClient.connect('http://localhost:5000', token);
  }
  
  // 监听文件夹更新事件
  wsClient.on('folders_updated', handleFoldersUpdated);
  
  // 添加训练状态更新监听
  wsClient.on('training_status_update', handleTrainingStatusUpdate);
  
  // 启动状态监控计时器
  startStateMonitor();
  eventBus.on('visualization-active', handleVisualizationActivity);
});

onBeforeUnmount(() => {
  // 清理轮询和事件监听
  clearTaskCheckInterval();
  eventBus.off('point-cloud-processed', handlePointCloudProcessed);
  eventBus.off('visualization-active', handleVisualizationActivity);
  // 移除所有监听并断开连接
  wsClient.off('folders_updated');
  wsClient.off('training_status_update');
  if(wsClient.isConnected()) {
      wsClient.disconnect();
  }
  
  // 清理状态监控计时器
  clearStateMonitor();
});
// 方法函数
const syncAndInitialize = async () => {
  await syncTaskWithBackend();
  fetchFolders();
  fetchResults();
};

const handleVisualizationActivity = () => {
  const task = currentTask.value;
  
  if (!task || !task.task_id || !['running', 'processing'].includes(task.status)) {
    console.warn('Inconsistent state detected: Visualization is active, but UI shows no running task. Forcing state synchronization.');
    syncTaskWithBackend();
  }
};

const syncTaskWithBackend = async () => {
  console.log("Syncing task state with backend to prevent stale cache issues.");
  try {
    const usernameValue = getUsername();
    if (!usernameValue) {
        store.dispatch('clearTrainingTask');
        isProcessing.value = false;
        return;
    }

    const response = await TrainingService.checkActiveTask(usernameValue);
    const activeTask = (response && response.active_tasks && response.active_tasks.length > 0) ? response.active_tasks[0] : null;

    if (activeTask && ['running', 'processing'].includes(activeTask.status)) {
        console.log(`Backend reports active task: ${activeTask.task_id} with status ${activeTask.status}`);
        const taskData = {
            task_id: activeTask.task_id,
            status: activeTask.status,
            progress: activeTask.progress || 0,
            message: activeTask.message || 'Restored active task...',
            output_logs: activeTask.output_logs || [],
            start_time: activeTask.start_time,
            folder_name: activeTask.folder_name || (activeTask.source_path ? activeTask.source_path.split('/').pop() : 'Unknown'),
        };
        store.dispatch('setTrainingTask', taskData);
        selectedFolder.value = taskData.folder_name;
        isProcessing.value = true;
    } else {
        console.log("Backend reports no active tasks, or task is in a final state. Clearing local state.");
        store.dispatch('clearTrainingTask');
        isProcessing.value = false;
    }
  } catch (error) {
    console.error('Failed to sync task state with backend:', error);
    ElMessage.error('无法同步训练状态，将清除本地状态以避免界面卡死');
    store.dispatch('clearTrainingTask');
    isProcessing.value = false;
  }
};

const getUsername = () => {
  return username.value;
};

const fetchFolders = async () => {
  loadingFolders.value = true;
  httpError.value = null;
  try {
    const usernameValue = getUsername();

    const response = await TrainingService.getPointCloudResults(usernameValue);
    handlePointCloudResultsResponse(response);
    return folders.value;
  } catch (error) {
    httpError.value = 'Failed to load folders. Please check backend connection.';
    ElMessage.error(httpError.value);
    return [];
  } finally {
    loadingFolders.value = false;
  }
};

const fetchResults = async () => {
  loadingResults.value = true;
  const usernameValue = getUsername();
  if (!usernameValue) {
    loadingResults.value = false;
    return;
  }
  
  TrainingService.getTrainingResults(usernameValue)
    .then(response => {
      results.value = response.results || [];
    })
    .catch(error => {
      console.error('获取训练结果失败:', error);
      ElMessage.error('无法加载训练历史记录');
      results.value = [];
    })
    .finally(() => {
      loadingResults.value = false;
    });
};

const selectFolder = (folder) => {
  selectedFolder.value = folder.folder_name || folder.name;
  selectedFolderDetails.value = folder;
};

const parseIterationString = (str) => {
  return TrainingParams.parseIterations(str);
};

const resetParams = () => {
  Object.assign(trainingParams, TrainingParams.getDefaultParams());
  testIterationsInput.value = "7000 30000";
  saveIterationsInput.value = "7000 30000";
  checkpointIterationsInput.value = "";
  ElNotification({
    title: '操作成功',
    message: '所有训练参数已恢复默认设置',
    type: 'success',
    position: 'top-right',
    duration: 2000,
    showClose: true
  });
};

const startTraining = async () => {
  const folderValidation = TrainingUtils.validateFolderSelection(selectedFolderDetails.value);
  if (!folderValidation.isValid) {
    ElNotification({
      title: '操作失败',
      message: folderValidation.error,
      type: 'error',
      position: 'top-right',
      duration: 2000,
      showClose: true
    });
    return;
  }

  isProcessing.value = true;
  httpError.value = null;
  
  // 重置状态监控计数器
  resetStateMonitorCounters();

  try {
    const usernameValue = getUsername();
    const sourcePath = selectedFolderDetails.value.output_folder;

    const paramValidation = TrainingParams.validateParams(trainingParams);
    if (!paramValidation.isValid) {
      ElNotification({
        title: '操作失败',
        message: '参数验证失败: ' + paramValidation.errors.join(', '),
        type: 'error',
        position: 'top-right',
        duration: 2000,
        showClose: true
      });
      isProcessing.value = false; // 终止处理
      return;
    }

    // 格式化参数
    const cleanParams = TrainingParams.formatParamsForAPI(trainingParams);

    // 添加WebSocket配置到参数中
    cleanParams.ip = 'localhost';
    cleanParams.port = 6009;
    
    // 构造任务数据
    const taskData = {
      username: usernameValue,
      source_path: sourcePath,
      websocket_port: 6009, 
      websocket_host: 'localhost', 
      params: cleanParams
    };

    const response = await TrainingService.startTraining(taskData);
    handleStartTrainingResponse(response);
  } catch (error) {
    httpError.value = `Failed to start training: ${error.message}`;
    ElNotification({
      title: '操作失败',
      message: httpError.value,
      type: 'error',
      position: 'top-right',
      duration: 2000,
      showClose: true
    });
    store.dispatch('setTrainingTask', { status: 'failed', message: httpError.value, error: httpError.value });
  } finally {
    isProcessing.value = false;
  }
};

const handleStartTrainingResponse = (data) => {
  if (data && data.task_id) {

    const taskData = {
      task_id: data.task_id,
      status: data.status || 'running', 
      progress: 0,
      message: data.message || 'Training started...',
      output_logs: [],
      start_time: new Date().toISOString(),
      folder_name: selectedFolder.value,
      model_path: data.model_path,
      visualization_url: data.visualization ? `http://${data.visualization.host}:${data.visualization.port}` : null,
      websocket: data.websocket || { 
        host: 'localhost',
        port: 6009
      }
    };
    store.dispatch('setTrainingTask', taskData);
    ElNotification({
      title: '操作成功',
      message: '训练任务已成功启动',
      type: 'success',
      position: 'bottom-right',
      customClass: 'custom-notification',
      duration: 3000
    });
  } else {
    ElMessage.error('训练失败: 服务器响应无效。');
    store.dispatch('setTrainingTask', { status: 'failed', message: 'Invalid server response on start.' });
  }
};

const startTaskStatusPolling = (taskId) => {
  // 如果WebSocket已连接，则注册任务监听
  if (wsClient.isConnected()) {
    wsClient.emit('register_task_updates', {
      username: getUsername(),
      task_id: taskId
    });
  } else {
    // 如果WebSocket未连接，回退到HTTP轮询实现
    fallbackToHttpPolling(taskId);
  }
};

const fallbackToHttpPolling = (taskId) => {
  if (taskCheckInterval.value) {
    clearInterval(taskCheckInterval.value);
  }
  
  taskCheckInterval.value = setInterval(async () => {
    try {
      const response = await TrainingService.getTrainingStatus(getUsername(), taskId);
      handleTrainingStatusUpdate(response);
    } catch (error) {
      console.error('轮询任务状态时发生错误:', error);
      if (error.status === 404) {
        ElMessage.error('服务器上找不到任务。停止更新。');
        clearTaskCheckInterval();
        store.dispatch('setTrainingTask', { ...currentTask.value, status: 'failed', message: '服务器上找不到任务。' });
      }
    }
  }, 3000); // 每3秒轮询一次
};

// 修改clearTaskCheckInterval方法
const clearTaskCheckInterval = () => {
  if (taskCheckInterval.value) {
    clearInterval(taskCheckInterval.value);
    taskCheckInterval.value = null;
  }
  
  // 如果WebSocket已连接，则取消任务更新
  if (wsClient.isConnected() && currentTask.value && currentTask.value.task_id) {
    wsClient.emit('unregister_task_updates', {
      username: getUsername(),
      task_id: currentTask.value.task_id
    });
  }
};

const checkActiveTask = async () => {
  // This method will check if there's an active task for the user when the component mounts.
  try {
    const usernameValue = getUsername();
    const response = await TrainingService.checkActiveTask(usernameValue);
    
    if (response && response.active_tasks && response.active_tasks.length > 0) {
      const activeTask = response.active_tasks[0]; // Assuming one active task per user for now    
      
      selectedFolder.value = activeTask.folder_name || (activeTask.source_path ? activeTask.source_path.split('/').pop() : 'Unknown');

      const taskData = {
        task_id: activeTask.task_id,
        status: activeTask.status,
        progress: activeTask.progress || 0,
        message: activeTask.message || 'Restored active task...',
        output_logs: activeTask.output_logs || [],
        start_time: activeTask.start_time,
        folder_name: selectedFolder.value,
        // model_path might not be available in active_tasks, depends on backend
      };
      store.dispatch('setTrainingTask', taskData);
      // Polling will be started by the watcher
    } else {
      console.log('No active training tasks found for user on mount.');
       // Ensure any lingering task in Vuex is cleared if backend says no active tasks
      if (currentTask.value && currentTask.value.task_id && (currentTask.value.status === 'running' || currentTask.value.status === 'processing')) {
        store.dispatch('clearTrainingTask');
    }
    }
  } catch (error) {
    console.error('Error checking for active tasks:', error.response ? error.response.data : error.message);
    ElMessage.error('Failed to check for active tasks.');
  }
};

const cancelTask = async () => {
  if (!currentTask.value || !currentTask.value.task_id) {
    ElMessage.warn('No active task to cancel.');
    return;
  }

  isProcessing.value = true; // Indicate processing start

  try {
    const usernameValue = getUsername();
    const taskId = currentTask.value.task_id;
  
    // Immediately stop local polling to prevent race conditions
    clearTaskCheckInterval();
    
    const response = await TrainingService.cancelTraining(usernameValue, taskId);
    handleCancelTaskResponse(response);

  } catch (error) {
    console.error('Error cancelling task:', error.response ? error.response.data : error.message);
    httpError.value = `Failed to cancel task: ${error.response?.data?.error || error.message}`;
    ElMessage.error(httpError.value);
    // Even if API call fails, update local state to reflect cancellation attempt
    const currentTaskState = store.getters.trainingCurrentTask;
    store.dispatch('setTrainingTask', { ...currentTaskState, status: 'failed', message: 'Cancellation failed.', error: httpError.value });
  } finally {
    isProcessing.value = false; // Indicate processing end
  }
};

const handleCancelTaskResponse = (data) => {
  ElNotification({
    title: '任务取消',
    message: data.message || '任务取消请求已成功发送',
    type: 'info',
    position: 'top-right',
    duration: 3000,
    showClose: true,
    customClass: 'custom-notification'
  });
  
  // Update task state in Vuex to 'cancelled'
  // The backend should eventually confirm this state via polling if cancellation is async
  // Or, if backend confirms immediately, this is fine.
  const currentTaskState = store.getters.trainingCurrentTask;
  store.dispatch('setTrainingTask', { 
    ...currentTaskState, 
    status: 'cancelled', 
    message: data.message || 'Task cancelled by user.',
    end_time: new Date().toISOString()
  });

  isProcessing.value = false; // Reset processing flag
  clearTaskCheckInterval(); // Ensure polling stops
  
  // Delay reset to allow user to see status, then refresh results
  setTimeout(() => {
    resetTaskState(); 
    fetchResults();
    fetchFolders(); // Refresh folders as well
  }, 1500);
};

const resetTaskState = () => {
  store.dispatch('clearTrainingTask'); // Clears the task from Vuex
  selectedFolder.value = null;
  selectedFolderDetails.value = null;
  isProcessing.value = false;
  httpError.value = null;
  clearTaskCheckInterval(); // Ensure polling stops
  ElMessage.info('准备开始新的训练任务。');
};

const checkAndCleanInvalidState = () => {
  const task = store.getters.trainingCurrentTask;
  
  // 状态一致性检查 - 如果没有任务但isProcessing为true，重置它
  if ((!task || !task.task_id) && isProcessing.value) {
    console.warn('检测到无效状态：isProcessing=true但没有训练任务');
    isProcessing.value = false;
  }
  
  if (task && task.task_id && (task.status === 'running' || task.status === 'processing')) {
    // 这里应该显示任务ID
    verifyTaskStatusWithBackend(task.task_id);
  } else if (task && (task.status === 'cancelled' || task.status === 'failed' || task.status === 'completed')) {
    resetTaskState();
  }
};

const verifyTaskStatusWithBackend = async (taskId) => {
  try {
    const usernameValue = getUsername();
    const backendTaskStatus = await TrainingService.getTrainingStatus(usernameValue, taskId);

    if (backendTaskStatus && (backendTaskStatus.status === 'running' || backendTaskStatus.status === 'processing')) {
      store.dispatch('setTrainingTask', { ...currentTask.value, ...backendTaskStatus });
      // Polling will be started/managed by the watcher
    } else {
      console.log(`Task ${taskId} is not active on backend (status: ${backendTaskStatus?.status}). Clearing from store.`);
      store.dispatch('clearTrainingTask');
    }
  } catch (error) {
    console.error(`Error verifying task ${taskId} with backend:`, error.response ? error.response.data : error.message);
    if (error.response && error.response.status === 404) {
       console.log(`Task ${taskId} not found on backend. Clearing from store.`);
       store.dispatch('clearTrainingTask');
    }
  }
};

const forceReset = () => {
  clearTaskCheckInterval();
  resetTaskState(); // This now clears Vuex and resets local component state
  ElNotification({
      title: '操作成功',
      message: '所有训练状态已重置',
      type: 'success',
      position: 'top-right',
      customClass: 'custom-notification',
      duration: 2000
    });
  fetchFolders(); // Refresh folder list
  fetchResults(); // Refresh history
};

const handlePointCloudProcessed = (processedData) => {
  fetchFolders().then(() => {
    const folder = folders.value.find(f => f.output_folder === processedData.output_folder);
    if (folder) {
      selectFolder(folder);
      ElNotification({
        title: '操作成功',
        message: `自动选择新处理的文件夹: ${folder.folder_name || folder.name}`,
        type: 'success',
        position: 'top-right',
        duration: 2000,
        showClose: true
      });
    }
  });
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const date = new Date( (typeof timestamp === 'number' && timestamp < 10000000000) ? timestamp * 1000 : timestamp);
  return date.toLocaleString();
};

const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [
    h > 0 ? `${h}h` : '',
    m > 0 ? `${m}m` : '',
    s > 0 ? `${s}s` : ''
  ].filter(Boolean).join(' ') || '0s';
};

const handlePointCloudResultsResponse = (responseData) => {
  const data = responseData.data || responseData;
  if (data && data.results && Array.isArray(data.results)) {
    folders.value = data.results || [];
    if (folders.value.length === 0) {
      console.warn('No completed point cloud folders found from API.');
    }
  } else {
    console.error('Invalid point cloud results structure:', data);
    folders.value = [];
    ElMessage.error('Failed to parse point cloud folder list.');
  }
};

const confirmDeleteResult = async (result) => {
  try {
    await ElMessageBox.confirm(
      `您确定要永久删除训练结果文件夹 "${result.folder_name}" 及其所有内容吗？此操作不可逆。`,
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    deleteResult(result);
  } catch (e) {
    ElMessage.info('删除操作已取消');
  }
};

const deleteResult = async (result) => {
  try {
    const folderName = result.folder_name;

    // 检查WebSocket连接
    if (!wsClient.isConnected()) {
      ElNotification({
        title: '操作失败',
        message: 'WebSocket未连接，请刷新页面重试',
        type: 'error',
        position: 'top-right',
        duration: 2000
      });
      return;
    }

    // 显示加载中状态
    ElMessage.info('正在删除文件夹，请稍候...');

    const response = await wsClient.emitWithAck('delete_training_result', {
      token: localStorage.getItem('token'),
      folder_name: folderName,
      folderType: 'models'
    }, 30000);
    console.log('删除文件夹响应:', response);
    if (response && response.status === 'success') {
      ElNotification({
        title: '操作成功',
        message: response.message || '删除请求已成功发送',
        type: 'success',
        position: 'top-right',
        duration: 2000,
        showClose: true
      });
      
      // 刷新列表
      fetchResults();
    } else {
      console.error('删除失败:', response);
      ElNotification({
        title: '操作失败',
        message: response.message || '删除失败',
        type: 'error',
        position: 'top-right',
        duration: 2000,
        showClose: true
      });
    }
  } catch (error) {
    console.error('删除请求异常:', error);
    ElNotification({
      title: '操作失败',
      message: error.message || '删除请求失败或超时',
      type: 'error',
      position: 'top-right',
      duration: 2000,
      showClose: true
    });
  }
};

const fetchPointCloudFolders = async () => {
  try {
    const usernameValue = store.getters.user?.username;
    if (!usernameValue) {
      return;
    }
    const response = await TrainingService.getPointCloudResults(usernameValue);
    if (response && Array.isArray(response.results)) {
      // Note: pointCloudFolders is not defined in the reactive data, might need to add it
      // pointCloudFolders.value = response.results;
    } else {
      // pointCloudFolders.value = [];
    }
  } catch (err) {
    // pointCloudFolders.value = [];
    ElNotification({
      title: '操作失败',
      message: '无法加载已处理的点云文件夹列表。',
      type: 'error',
      position: 'top-right',
      duration: 2000,
      showClose: true
    });
  }
};

const handleFoldersUpdated = (data) => {
  const currentUser = store.getters.user?.username;
  if (data.username === currentUser) {
    fetchTrainingResults();
    fetchPointCloudFolders();
  }
};

const fetchTrainingResults = () => {
  loadingResults.value = true;
  const usernameValue = getUsername();
  if (!usernameValue) {
    loadingResults.value = false;
    return;
  }
  
  TrainingService.getTrainingResults(usernameValue)
    .then(response => {
      results.value = response.results || [];
    })
    .catch(error => {
      console.error('获取训练结果失败:', error);
      ElMessage.error('无法加载训练历史记录');
      results.value = [];
    })
    .finally(() => {
      loadingResults.value = false;
    });
};

const updateTaskStatus = (updatedTask) => {
    // Note: trainingResults is not defined in the reactive data, might need to add it
    // const index = trainingResults.value.findIndex(t => t.task_id === updatedTask.task_id);
    // if (index !== -1) {
    //     // 使用Vue的响应式方式更新数组元素
    //     trainingResults.value.splice(index, 1, { ...trainingResults.value[index], ...updatedTask });
    // } else {
    //     // 如果任务不在列表中，可能是新任务，则添加到列表
    //     trainingResults.value.unshift(updatedTask);
    // }
};

const handleTrainingStatusUpdate = (data) => {
  if (!data) return;
  
  // 记录状态变化
  recordStateChange(data.status);
    
  // 更新Vuex存储中的任务状态
  const updatedTaskData = {
    ...currentTask.value,
    ...data
  };
  store.dispatch('setTrainingTask', updatedTaskData);
  if (['completed', 'failed', 'cancelled'].includes(data.status)) {
    clearTaskCheckInterval();
    isProcessing.value = false;
    const finalTask = {
      ...currentTask.value,
      ...data,
      end_time: data.end_time || new Date().toISOString()
    };
    store.dispatch('setTrainingTask', finalTask);
    if (data.status === 'cancelled') {
      setTimeout(() => resetTaskState(), 1500);
    }
    fetchResults();
  }
};

// 添加状态监控相关方法
const startStateMonitor = () => {
  // 清除任何现有的监控器
  clearStateMonitor();
  
  // 设置初始状态
  lastTaskStatus.value = currentTask.value?.status || 'idle';
  lastStateChangeTime.value = Date.now();
  stateChangeCounter.value = 0;
  
  // 创建新的监控器 - 每10秒检查一次状态
  stateMonitorInterval.value = setInterval(() => {
    checkStateStability();
  }, 10000);
};

const clearStateMonitor = () => {
  if (stateMonitorInterval.value) {
    clearInterval(stateMonitorInterval.value);
    stateMonitorInterval.value = null;
  }
};

const resetStateMonitorCounters = () => {
  stateChangeCounter.value = 0;
  lastStateChangeTime.value = Date.now();
  lastTaskStatus.value = currentTask.value?.status || 'idle';
};

const recordStateChange = (newStatus) => {
  if (newStatus !== lastTaskStatus.value) {
    lastTaskStatus.value = newStatus;
    lastStateChangeTime.value = Date.now();
    stateChangeCounter.value = 0;
  }
};

const checkStateStability = () => {
  // 只有在训练过程中才进行状态稳定性检查
  if (!currentTask.value || !currentTask.value.task_id) {
    return;
  }
  
  // 如果处于"processing"或"running"状态，检查是否长时间未变化
  if (
    (currentTask.value.status === 'processing' || currentTask.value.status === 'running') && 
    isProcessing.value
  ) {
    const now = Date.now();
    const elapsedSeconds = (now - lastStateChangeTime.value) / 1000;
    
    // 增加计数器
    stateChangeCounter.value++;
    
    // 如果状态超过2分钟未变化，且至少检查了10次
    if (elapsedSeconds > 120 && stateChangeCounter.value >= 10) {
      console.warn(`训练状态 "${currentTask.value.status}" 已经 ${Math.floor(elapsedSeconds)} 秒未变化，可能卡住了`);
      
      // 弹出通知，询问用户是否要重置
      ElMessageBox.confirm(
        `训练状态似乎已经${Math.floor(elapsedSeconds)}秒未更新。可能是后端通信问题或训练过程卡住了。`,
        '训练状态可能卡住',
        {
          confirmButtonText: '重置状态',
          cancelButtonText: '继续等待',
          type: 'warning'
        }
      ).then(() => {
        // 用户选择重置
        forceReset();
      }).catch(() => {
        // 用户选择继续等待，重置计数器
        resetStateMonitorCounters();
      });
    }
    
    // 如果状态超过5分钟未变化，自动重置
    if (elapsedSeconds > 300) {
      console.error(`训练状态 "${currentTask.value.status}" 已经 ${Math.floor(elapsedSeconds)} 秒未变化，自动重置`);
      ElNotification({
        title: '状态自动重置',
        message: `训练状态已超过5分钟未更新，系统已自动重置`,
        type: 'warning',
        position: 'top-right',
        duration: 3000
      });
      forceReset();
    }
  }
  
  // 检查isProcessing是否卡住 - 如果没有活动任务但isProcessing为true
  if (isProcessing.value && (!currentTask.value || !currentTask.value.task_id || 
      ['completed', 'failed', 'cancelled'].includes(currentTask.value.status))) {
    console.warn('检测到处理状态不一致：isProcessing=true但没有活动任务');
    // 重置处理状态
    isProcessing.value = false;
  }
};

const viewResults = () => {
  // 实现查看结果的逻辑
  if (currentTask.value && currentTask.value.model_path) {
    router.push(`/results/${currentTask.value.folder_name}`);
  }
};

// 返回所有响应式变量和函数供模板使用
return {
  // 响应式数据
  loadingFolders,
  loadingResults,
  folders,
  results,
  selectedFolder,
  selectedFolderDetails,
  isProcessing,
  httpError,
  testIterationsInput,
  saveIterationsInput,
  checkpointIterationsInput,
  trainingParams,
  
  // 计算属性
  username,
  currentTask,
  parsedTestIterations,
  parsedSaveIterations,
  parsedCheckpointIterations,
  
  // 方法函数
  selectFolder,
  resetParams,
  startTraining,
  cancelTask,
  resetTaskState,
  forceReset,
  formatDate,
  formatTime,
  confirmDeleteResult,
  deleteResult,
  viewResults,
  
  // 图标
  ...icons
};
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
