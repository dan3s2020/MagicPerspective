#include <cuda_runtime.h>
#include <stdint.h>

// One thread owns one row.  It walks the proposal in the original j order
// and updates the already accumulated score tensor in place.  This is not a
// parallel floating reduction: every FP32 division/addition has the same
// row-local order as text_gpu.py's former Python loop.
__global__ void exact_weighted_histogram(
    const int64_t* ys, const float* weights, float* scores,
    float* digit_mass, int rows, int width, int form_source) {
  const int row = blockIdx.x * blockDim.x + threadIdx.x;
  if (row >= rows) return;
  const int64_t* source = ys + (int64_t)row * width;
  int count = 0;
  for (int j = 0; j < width; ++j) count += source[j] >= 0;
  if (count == 0) count = 1;
  const float q = __fdiv_rn(weights[row], (float)count);
  float* target = scores + (int64_t)row * 129;
  float digits = digit_mass[row];
  for (int j = 0; j < width; ++j) {
    const int64_t raw = source[j];
    if (raw < 0) continue;
    const int symbol = raw > 128 ? 128 : (int)raw;
    if (form_source && symbol == 48) digits = __fadd_rn(digits, q);
    else target[symbol] = __fadd_rn(target[symbol], q);
  }
  digit_mass[row] = digits;
}

extern "C" __declspec(dllexport) int mp_exact_weighted_histogram(
    const int64_t* ys, const float* weights, float* scores,
    float* digit_mass, int rows, int width, int form_source,
    void* stream) {
  if (!ys || !weights || !scores || !digit_mass || rows < 0 || width < 0)
    return (int)cudaErrorInvalidValue;
  if (rows == 0 || width == 0) return 0;
  exact_weighted_histogram<<<(rows + 255) / 256, 256, 0,
    reinterpret_cast<cudaStream_t>(stream)>>>(
      ys, weights, scores, digit_mass, rows, width, form_source);
  return (int)cudaPeekAtLastError();
}
