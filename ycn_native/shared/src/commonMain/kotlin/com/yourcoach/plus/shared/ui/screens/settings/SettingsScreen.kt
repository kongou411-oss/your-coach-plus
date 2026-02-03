package com.yourcoach.plus.shared.ui.screens.settings

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.CustomFood
import com.yourcoach.plus.shared.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Settings Tab definition
 */
enum class SettingsTab(
    val label: String,
    val icon: ImageVector
) {
    BASIC("Basic", Icons.Default.Person),
    FEATURES("Features", Icons.Default.Tune),
    DATA("Data", Icons.Default.Storage),
    OTHER("Other", Icons.Default.MoreHoriz)
}

/**
 * Settings Screen (Compose Multiplatform)
 */
class SettingsScreen(
    private val onNavigateToProfile: () -> Unit = {},
    private val onNavigateToNotifications: () -> Unit = {},
    private val onNavigateToBadges: () -> Unit = {},
    private val onNavigateToPremium: () -> Unit = {},
    private val onNavigateToRoutine: () -> Unit = {},
    private val onNavigateToTemplates: () -> Unit = {},
    private val onNavigateToMealSlots: () -> Unit = {},
    private val onNavigateToHelp: () -> Unit = {},
    private val onNavigateToAbout: () -> Unit = {},
    private val onNavigateToTerms: () -> Unit = {},
    private val onNavigateToPrivacy: () -> Unit = {},
    private val onNavigateToFeedback: () -> Unit = {},
    private val onLoggedOut: () -> Unit = {}
) : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<SettingsScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val snackbarHostState = remember { SnackbarHostState() }
        var showLogoutDialog by remember { mutableStateOf(false) }
        var showDeleteAccountDialog by remember { mutableStateOf(false) }

        val pagerState = rememberPagerState(pageCount = { SettingsTab.entries.size })
        val scope = rememberCoroutineScope()

        // Logout completed
        LaunchedEffect(uiState.isLoggedOut) {
            if (uiState.isLoggedOut) {
                onLoggedOut()
            }
        }

        // Account deletion completed
        LaunchedEffect(uiState.isAccountDeleted) {
            if (uiState.isAccountDeleted) {
                onLoggedOut()
            }
        }

        // Error display
        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
            }
        }

        // Credits added message
        LaunchedEffect(uiState.creditsAddedMessage) {
            uiState.creditsAddedMessage?.let { message ->
                snackbarHostState.showSnackbar(message)
                screenModel.clearCreditsAddedMessage()
            }
        }

        // Custom food action message
        LaunchedEffect(uiState.customFoodActionMessage) {
            uiState.customFoodActionMessage?.let { message ->
                snackbarHostState.showSnackbar(message)
                screenModel.clearCustomFoodActionMessage()
            }
        }

        // Logout confirmation dialog
        if (showLogoutDialog) {
            AlertDialog(
                onDismissRequest = { showLogoutDialog = false },
                title = { Text("Logout") },
                text = { Text("Are you sure you want to logout?") },
                confirmButton = {
                    TextButton(
                        onClick = {
                            showLogoutDialog = false
                            screenModel.logout()
                        }
                    ) {
                        Text("Logout", color = Color.Red)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showLogoutDialog = false }) {
                        Text("Cancel")
                    }
                }
            )
        }

        // Account deletion confirmation dialog
        if (showDeleteAccountDialog) {
            AlertDialog(
                onDismissRequest = {
                    if (!uiState.isDeletingAccount) {
                        showDeleteAccountDialog = false
                    }
                },
                title = { Text("Delete Account") },
                text = {
                    Column {
                        Text("Are you sure you want to delete your account?")
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "This action cannot be undone. All data (meal records, workout records, analysis history, etc.) will be permanently deleted.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                },
                confirmButton = {
                    TextButton(
                        onClick = {
                            screenModel.deleteAccount()
                        },
                        enabled = !uiState.isDeletingAccount
                    ) {
                        if (uiState.isDeletingAccount) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Delete", color = Color.Red)
                        }
                    }
                },
                dismissButton = {
                    TextButton(
                        onClick = { showDeleteAccountDialog = false },
                        enabled = !uiState.isDeletingAccount
                    ) {
                        Text("Cancel")
                    }
                }
            )
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // Profile/Account section (expandable)
                ProfileAccountSection(
                    userName = uiState.user?.profile?.nickname
                        ?: uiState.user?.displayName
                        ?: uiState.user?.email?.substringBefore("@")
                        ?: "Guest",
                    email = uiState.user?.email ?: "",
                    userId = uiState.user?.uid ?: "",
                    photoUrl = uiState.user?.photoUrl,
                    isPremium = uiState.isPremium,
                    isUploadingPhoto = uiState.isUploadingPhoto,
                    organizationName = uiState.organizationName,
                    onLogout = { showLogoutDialog = true },
                    onDeleteAccount = { showDeleteAccountDialog = true },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )

                // Tabs
                TabRow(
                    selectedTabIndex = pagerState.currentPage,
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.primary
                ) {
                    SettingsTab.entries.forEachIndexed { index, tab ->
                        Tab(
                            selected = pagerState.currentPage == index,
                            onClick = {
                                scope.launch {
                                    pagerState.animateScrollToPage(index)
                                }
                            },
                            text = {
                                Text(
                                    text = tab.label,
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = if (pagerState.currentPage == index) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            icon = {
                                Icon(
                                    imageVector = tab.icon,
                                    contentDescription = tab.label,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        )
                    }
                }

                // Tab content
                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier.fillMaxSize()
                ) { page ->
                    when (SettingsTab.entries[page]) {
                        SettingsTab.BASIC -> BasicSettingsTab(
                            onNavigateToProfile = onNavigateToProfile,
                            onNavigateToNotifications = onNavigateToNotifications,
                            onNavigateToBadges = onNavigateToBadges,
                            onNavigateToPremium = onNavigateToPremium,
                            isPremium = uiState.isPremium
                        )
                        SettingsTab.FEATURES -> FeaturesSettingsTab(
                            onNavigateToRoutine = onNavigateToRoutine,
                            onNavigateToTemplates = onNavigateToTemplates,
                            onNavigateToMealSlots = onNavigateToMealSlots
                        )
                        SettingsTab.DATA -> DataSettingsTab(
                            customFoods = uiState.customFoods,
                            isLoadingCustomFoods = uiState.isLoadingCustomFoods,
                            totalCredits = uiState.freeCredits + uiState.paidCredits,
                            isAnalyzingNutrition = uiState.isAnalyzingNutrition,
                            analyzingFoodId = uiState.analyzingFoodId,
                            onUpdateCustomFood = { id, name, cal, p, c, f, fiber ->
                                screenModel.updateCustomFood(id, name, cal, p, c, f, fiber)
                            },
                            onDeleteCustomFood = { screenModel.deleteCustomFood(it) }
                        )
                        SettingsTab.OTHER -> OtherSettingsTab(
                            appVersion = uiState.appVersion,
                            onNavigateToHelp = onNavigateToHelp,
                            onNavigateToFeedback = onNavigateToFeedback,
                            onNavigateToAbout = onNavigateToAbout,
                            onNavigateToTerms = onNavigateToTerms,
                            onNavigateToPrivacy = onNavigateToPrivacy
                        )
                    }
                }
            }
        }
    }
}

/**
 * Basic settings tab
 */
@Composable
private fun BasicSettingsTab(
    onNavigateToProfile: () -> Unit,
    onNavigateToNotifications: () -> Unit,
    onNavigateToBadges: () -> Unit,
    onNavigateToPremium: () -> Unit,
    isPremium: Boolean
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            SettingsCard {
                SettingsRow(
                    icon = Icons.Default.Person,
                    title = "Profile Settings",
                    subtitle = "Edit height, weight, goals",
                    onClick = onNavigateToProfile
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.Notifications,
                    title = "Notification Settings",
                    subtitle = "Manage reminders and notifications",
                    onClick = onNavigateToNotifications
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.EmojiEvents,
                    title = "Achievements & Badges",
                    subtitle = "View your achievements",
                    onClick = onNavigateToBadges
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.Star,
                    title = "Premium",
                    subtitle = if (isPremium) "Premium Member" else "Upgrade features",
                    onClick = onNavigateToPremium,
                    badge = if (!isPremium) "Upgrade" else null,
                    badgeColor = AccentOrange
                )
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

/**
 * Features settings tab
 */
@Composable
private fun FeaturesSettingsTab(
    onNavigateToRoutine: () -> Unit,
    onNavigateToTemplates: () -> Unit,
    onNavigateToMealSlots: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            SectionHeader("Routine & Templates")
        }

        item {
            SettingsCard {
                SettingsRow(
                    icon = Icons.Default.Repeat,
                    title = "Routine Settings",
                    subtitle = "Set training splits by day",
                    onClick = onNavigateToRoutine
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.BookmarkAdd,
                    title = "Template Management",
                    subtitle = "Edit meal and workout templates",
                    onClick = onNavigateToTemplates
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.Schedule,
                    title = "Meal Slot Settings",
                    subtitle = "Configure fixed/AI/routine-linked slots",
                    onClick = onNavigateToMealSlots
                )
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

/**
 * Data settings tab
 */
@Composable
private fun DataSettingsTab(
    customFoods: List<CustomFood>,
    isLoadingCustomFoods: Boolean,
    totalCredits: Int,
    isAnalyzingNutrition: Boolean,
    analyzingFoodId: String?,
    onUpdateCustomFood: (String, String, Int, Float, Float, Float, Float) -> Unit,
    onDeleteCustomFood: (String) -> Unit
) {
    var showCustomFoodsDialog by remember { mutableStateOf(false) }
    var editingFood by remember { mutableStateOf<CustomFood?>(null) }
    var deletingFood by remember { mutableStateOf<CustomFood?>(null) }

    // Custom foods list dialog
    if (showCustomFoodsDialog) {
        CustomFoodsListDialog(
            customFoods = customFoods,
            isLoading = isLoadingCustomFoods,
            onEdit = { food ->
                editingFood = food
                showCustomFoodsDialog = false
            },
            onDelete = { food ->
                deletingFood = food
            },
            onDismiss = { showCustomFoodsDialog = false }
        )
    }

    // Edit dialog
    editingFood?.let { food ->
        CustomFoodEditDialog(
            food = food,
            totalCredits = totalCredits,
            isAnalyzing = isAnalyzingNutrition && analyzingFoodId == food.id,
            onSave = { name, cal, p, c, f, fiber ->
                onUpdateCustomFood(food.id, name, cal, p, c, f, fiber)
                editingFood = null
            },
            onDismiss = { editingFood = null }
        )
    }

    // Delete confirmation dialog
    deletingFood?.let { food ->
        AlertDialog(
            onDismissRequest = { deletingFood = null },
            title = { Text("Delete Confirmation") },
            text = { Text("Delete \"${food.name}\"?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        onDeleteCustomFood(food.id)
                        deletingFood = null
                    }
                ) {
                    Text("Delete", color = Color.Red)
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingFood = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            SectionHeader("Custom Foods")
        }

        item {
            SettingsCard {
                SettingsRow(
                    icon = Icons.Default.Restaurant,
                    title = "Manage Custom Foods",
                    subtitle = if (customFoods.isEmpty()) "No registrations" else "${customFoods.size} registered",
                    onClick = { showCustomFoodsDialog = true }
                )
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

/**
 * Custom foods list dialog
 */
@Composable
private fun CustomFoodsListDialog(
    customFoods: List<CustomFood>,
    isLoading: Boolean,
    onEdit: (CustomFood) -> Unit,
    onDelete: (CustomFood) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("Custom Foods", fontWeight = FontWeight.Bold)
        },
        text = {
            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (customFoods.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(140.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Restaurant,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "No custom foods",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "Foods not in the database will be",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            "automatically saved when recorded",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 400.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(customFoods.size) { index ->
                        val food = customFoods[index]
                        CustomFoodItem(
                            food = food,
                            onEdit = { onEdit(food) },
                            onDelete = { onDelete(food) }
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}

/**
 * Custom food item
 */
@Composable
private fun CustomFoodItem(
    food: CustomFood,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = food.name,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f, fill = false),
                        maxLines = 1
                    )
                    if (food.isAiAnalyzed) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Micro analyzed",
                            tint = AccentGreen,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(2.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "${food.calories}kcal",
                        style = MaterialTheme.typography.bodySmall,
                        color = ScoreCalories
                    )
                    Text(
                        text = "P${food.protein.toInt()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = ScoreProtein
                    )
                    Text(
                        text = "F${food.fat.toInt()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = ScoreFat
                    )
                    Text(
                        text = "C${food.carbs.toInt()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = ScoreCarbs
                    )
                }
                if (food.usageCount > 0) {
                    Text(
                        text = "Used ${food.usageCount} times",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Row {
                IconButton(
                    onClick = onEdit,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "Edit",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Delete",
                        tint = Color.Red,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

/**
 * Custom food edit dialog
 */
@Composable
private fun CustomFoodEditDialog(
    food: CustomFood,
    totalCredits: Int,
    isAnalyzing: Boolean,
    onSave: (String, Int, Float, Float, Float, Float) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf(food.name) }
    var calories by remember { mutableStateOf(food.calories.toString()) }
    var protein by remember { mutableStateOf(food.protein.toString()) }
    var carbs by remember { mutableStateOf(food.carbs.toString()) }
    var fat by remember { mutableStateOf(food.fat.toString()) }
    var fiber by remember { mutableStateOf(food.fiber.toString()) }

    AlertDialog(
        onDismissRequest = { if (!isAnalyzing) onDismiss() },
        title = { Text("Edit Custom Food", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.verticalScroll(rememberScrollState())
            ) {
                Text(
                    "Nutrition per 100g",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Food Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = calories,
                    onValueChange = { calories = it.filter { c -> c.isDigit() } },
                    label = { Text("Calories (kcal)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = protein,
                        onValueChange = { protein = it.filter { c -> c.isDigit() || c == '.' } },
                        label = { Text("P (g)") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = fat,
                        onValueChange = { fat = it.filter { c -> c.isDigit() || c == '.' } },
                        label = { Text("F (g)") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = carbs,
                        onValueChange = { carbs = it.filter { c -> c.isDigit() || c == '.' } },
                        label = { Text("C (g)") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }

                OutlinedTextField(
                    value = fiber,
                    onValueChange = { fiber = it.filter { c -> c.isDigit() || c == '.' } },
                    label = { Text("Fiber (g)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSave(
                        name,
                        calories.toIntOrNull() ?: 0,
                        protein.toFloatOrNull() ?: 0f,
                        carbs.toFloatOrNull() ?: 0f,
                        fat.toFloatOrNull() ?: 0f,
                        fiber.toFloatOrNull() ?: 0f
                    )
                },
                enabled = name.isNotBlank() && !isAnalyzing
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isAnalyzing) {
                Text("Cancel")
            }
        }
    )
}

/**
 * Other settings tab
 */
@Composable
private fun OtherSettingsTab(
    appVersion: String,
    onNavigateToHelp: () -> Unit,
    onNavigateToFeedback: () -> Unit,
    onNavigateToAbout: () -> Unit,
    onNavigateToTerms: () -> Unit,
    onNavigateToPrivacy: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            SectionHeader("Support")
        }

        item {
            SettingsCard {
                SettingsRow(
                    icon = Icons.AutoMirrored.Filled.Help,
                    title = "Help",
                    subtitle = "User Guide",
                    onClick = onNavigateToHelp
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.Feedback,
                    title = "Feedback",
                    subtitle = "Share your thoughts",
                    onClick = onNavigateToFeedback
                )
            }
        }

        item {
            SectionHeader("Legal Information")
        }

        item {
            SettingsCard {
                SettingsRow(
                    icon = Icons.Default.Description,
                    title = "Terms of Service",
                    onClick = onNavigateToTerms
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.Lock,
                    title = "Privacy Policy",
                    onClick = onNavigateToPrivacy
                )
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                SettingsRow(
                    icon = Icons.Default.Info,
                    title = "About",
                    subtitle = "Version $appVersion",
                    onClick = onNavigateToAbout
                )
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

/**
 * Profile/Account section (expandable)
 */
@Composable
private fun ProfileAccountSection(
    userName: String,
    email: String,
    userId: String,
    photoUrl: String?,
    isPremium: Boolean,
    isUploadingPhoto: Boolean,
    organizationName: String?,
    onLogout: () -> Unit,
    onDeleteAccount: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isExpanded by remember { mutableStateOf(false) }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // Header (tap to expand/collapse)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { isExpanded = !isExpanded }
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Profile image
                Box(
                    modifier = Modifier.size(64.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(Primary.copy(alpha = 0.2f))
                            .border(2.dp, Primary.copy(alpha = 0.3f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        if (isUploadingPhoto) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                strokeWidth = 2.dp,
                                color = Primary
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                tint = Primary,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = userName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        if (isPremium) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = "Premium",
                                tint = AccentOrange,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                    if (email.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = email,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (isExpanded) "Tap to close" else "Account settings",
                        style = MaterialTheme.typography.labelSmall,
                        color = Primary
                    )
                }

                Icon(
                    imageVector = if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Expandable section
            AnimatedVisibility(visible = isExpanded) {
                Column {
                    HorizontalDivider()

                    // User ID
                    if (userId.isNotEmpty()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Badge,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "User ID",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    text = "${userId.take(8)}...",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Icon(
                                imageVector = Icons.Default.ContentCopy,
                                contentDescription = "Copy",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                    }

                    // Organization
                    if (organizationName != null) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Business,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text(
                                    text = organizationName,
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Medium,
                                    color = Primary
                                )
                                Text(
                                    text = "Corporate plan active",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = AccentGreen
                                )
                            }
                        }
                        HorizontalDivider(modifier = Modifier.padding(start = 56.dp))
                    }

                    // Logout
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(onClick = onLogout)
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Logout,
                            contentDescription = null,
                            tint = Color(0xFFEF5350),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Text(
                            text = "Logout",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFFEF5350)
                        )
                    }

                    HorizontalDivider(modifier = Modifier.padding(start = 56.dp))

                    // Delete account
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(onClick = onDeleteAccount)
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.DeleteForever,
                            contentDescription = null,
                            tint = Color(0xFFEF5350),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(
                                text = "Delete Account",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color(0xFFEF5350)
                            )
                            Text(
                                text = "All data will be deleted",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * Section header
 */
@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontWeight = FontWeight.Medium,
        modifier = Modifier.padding(start = 4.dp, top = 8.dp)
    )
}

/**
 * Settings card
 */
@Composable
private fun SettingsCard(
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(content = content)
    }
}

/**
 * Settings row (with icon)
 */
@Composable
private fun SettingsRow(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    onClick: () -> Unit,
    badge: String? = null,
    badgeColor: Color = AccentOrange,
    isDestructive: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isDestructive) Color.Red else MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyLarge,
                    color = if (isDestructive) Color.Red else MaterialTheme.colorScheme.onSurface
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
            if (badge != null) {
                Box(
                    modifier = Modifier
                        .background(badgeColor.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = badge,
                        style = MaterialTheme.typography.labelSmall,
                        color = badgeColor,
                        fontWeight = FontWeight.Medium
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
            }
            if (!isDestructive) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
