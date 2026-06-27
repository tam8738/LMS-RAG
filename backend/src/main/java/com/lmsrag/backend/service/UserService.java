package com.lmsrag.backend.service;


import com.lmsrag.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final LevelRepository levelRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    // ================= CREATE =================
    public UserResponseDTO createUser(UserRequestDTO request) {

        // email existed
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        // role
        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

        // level mặc định
        Level level = levelRepository.findById(1)
                .orElseThrow(() -> new AppException(ErrorCode.LEVEL_NOT_FOUND));

        // ===== MAP =====
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());

        // 🔐 encode password
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        user.setRole(role);
        user.setLevel(level);
        user.setTotalPoints(0);

        // ===== SAVE =====
        User savedUser = userRepository.save(user);

        return userMapper.toResponse(savedUser);
    }

    // ================= GET ALL =================
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(userMapper::toResponse)
                .toList();
    }

    // ================= GET ID =================
    public UserResponseDTO getUserById(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return userMapper.toResponse(user);
    }

    // ================= admin update =================
    public UserResponseDTO updateUser(Integer id, UserRequestDTO request) {

        // check user tồn tại
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // check email trùng (trừ chính nó)
        if (!user.getEmail().equals(request.getEmail())
                && userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        // update basic
        user.setName(request.getName());
        user.setEmail(request.getEmail());

        // update role nếu có
        if (request.getRoleId() != null) {
            Role role = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
            user.setRole(role);
        }

        User updatedUser = userRepository.save(user);

        return userMapper.toResponse(updatedUser);
    }

    // ================= DELETE =================
    public void deleteUser(Integer id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        userRepository.delete(user);
    }
}