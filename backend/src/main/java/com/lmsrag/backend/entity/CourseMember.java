package com.lmsrag.backend.entity;

import com.lmsrag.backend.enums.CourseMemberStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "course_members")
@Getter
@Setter
@NoArgsConstructor
public class CourseMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    private CourseMemberStatus status;

    private Instant joinedAt;
}