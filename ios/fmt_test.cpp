#include "RNCharTraitsFix.pch"
#include <fmt/core.h>
#if FMT_USE_CHAR8_T
#error FMT_USE_CHAR8_T still enabled
#endif

fmt::is_char<char> cc;
